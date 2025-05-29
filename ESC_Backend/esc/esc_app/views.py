from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from django.db.models import Q

from rest_framework.views import APIView, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import permissions

import mimetypes

from .models import *
from .serializers import *
from .helpers import *

import logging
import os

from . import config
from .blockchain import Blockchain

# Create your views here.
@login_required
def index(request):
    current_user = AppUser.objects.get(user=request.user)
    cases = current_user.cases.all().order_by('id')
    return render(request, 'index.html', {'cases': cases})

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('index')
        else:
            return render(request, 'login.html', {'error': 'Invalid credentials'})
    return render(request, 'login.html')

def logout_view(request):
    logout(request)
    return redirect('login')

class CasesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    NAME_FIELD = "name"
    PROCNUM_FIELD = "procedure_number"

    #Obtém os dados de um ou mais registros
    def get(self, request, case_id=None):
        current_user =  AppUser.objects.get(user__id=request.user.id)  

        if case_id is None:
            cases = current_user.cases.all().order_by('id')

            serializer = CaseListSerializer(cases, many=True)

            response_data = {
            "user": {
                "username": current_user.user.username,
                "profile": current_user.profile
            },
            "cases": serializer.data
            }

            return Response(response_data)

        else:
            case = current_user.cases.get(id=case_id)
            if case is None:
                return Response("Case not found or access denied.", status=status.HTTP_400_BAD_REQUEST)
            
            serializer = CaseDetailsSerializer(case)
        
            return Response(serializer.data)
    
    def post(self, request):
        current_user =  AppUser.objects.get(user__id=request.user.id) 
        if current_user.profile != AppUser.Profile.GOV_AGENT:
            return Response("Access denied.", status=status.HTTP_400_BAD_REQUEST)

        #Form validadtion
        validated_form_data = {}
        errors = self.validate_case_form(request, validated_form_data, current_user)
        if errors is not None:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        case = Case.objects.create(name=validated_form_data[self.NAME_FIELD], procedure_number=validated_form_data[self.PROCNUM_FIELD], creation_user_id=request.user.id)
        current_user.cases.add(case)

        serializer = CaseDetailsSerializer(case)

        return Response(serializer.data)
    
    def put(self, request, case_id):
        case_id = int(case_id)

        current_user =  AppUser.objects.get(user__id=request.user.id) 
        if current_user.profile != AppUser.Profile.GOV_AGENT:
            return Response("Access denied.", status=status.HTTP_400_BAD_REQUEST)
        
        #Form validadtion
        validated_form_data = {}
        errors = self.validate_case_form(request, validated_form_data, current_user, case_id)
        if errors is not None:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        case = current_user.cases.get(id=case_id)
        if case is None:
            return Response("Case not found or access denied.", status=status.HTTP_400_BAD_REQUEST)
        
        case.name = validated_form_data[self.NAME_FIELD]
        case.procedure_number = validated_form_data[self.PROCNUM_FIELD]

        case.save()
        
        serializer = CaseDetailsSerializer(case)

        return Response(serializer.data)


    def validate_case_form(self, request, validated_data, current_user, case_id=None):
        """
        #Validates data, makes the necessary type conversions, updates validated_data dictionary with valid fields
        #Returns errors if any, else returns None
        #Suited for serverside JavaScript validation, since the list of errors could be converted to JSON and the
        #field ids used to trigger setCustomValidity on the corresponding fields

        If the case_id is passed means that the form to be validated refers to an existing case
        """
        name = request.data[self.NAME_FIELD]
        name = name.strip() if name is not None else ""
        name_len = len(name)

        procedure_number = request.data[self.PROCNUM_FIELD]
        procedure_number = procedure_number.strip() if procedure_number is not None else ""
        procedure_number_len = len(procedure_number)

        errors = {}

        if name_len < 5 or name_len > 100:
            errors[self.NAME_FIELD] = "Case name must have between 5 and 100 characters."
        else:
            #Name does not already exists among the cases that the user has access to, except the name of the case being changed
            #in case the operation is an update (put)
            if case_id is not None:
                existing_cases = current_user.cases.filter(~Q(id = case_id), name__iexact = name)
            else:
                existing_cases = current_user.cases.filter(name__iexact = name)

            if len(existing_cases) > 0:
                errors[self.NAME_FIELD] = "Case name is not available. Please select a different name."
            else:
                validated_data[self.NAME_FIELD] = name

        if procedure_number_len < 5 or procedure_number_len > 100:
            errors[self.PROCNUM_FIELD] = "Procedure Number must have between 5 and 100 characters."
        else:
            validated_data[self.PROCNUM_FIELD] = procedure_number
       
        if len(errors) == 0:
            return None
        
        return errors


class EvidencesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get(self, request, case_id, evidence_id=None):
        current_user =  AppUser.objects.get(user__id=request.user.id)
        
        case = current_user.cases.get(id=case_id)
        if case is None:
            return Response("Case not found or access denied.", status=status.HTTP_400_BAD_REQUEST)

        if evidence_id is not None:
            evidence_file = case.evidence_files.get(id=evidence_id) 
            history = EvidenceHistory.objects.create(
                evidence_file=evidence_file,
                operation=EvidenceHistory.Operation.DOWNLOADED_BY_USER,
                case=case,
                user=request.user
            )
            Blockchain.create_block(history)
              
            return download_evidence_file(self, request, evidence_file)
        else:
            ids = request.GET.get("ids")
            if ids is not None:
                ids = [int(id) for id in ids.split(',')]
                filteredEvidences = case.evidence_files.filter(case_id=case_id, id__in=ids).order_by('id')
            else:
                filteredEvidences = case.evidence_files.filter(case_id=case_id).order_by('id')

            serializer = EvidenceFileSerializer(filteredEvidences, many=True)

        return Response(serializer.data)


    def post(self, request, case_id):
        current_user =  AppUser.objects.get(user__id=request.user.id) 
        if current_user.profile != AppUser.Profile.SERVICE_PROVIDER:
            return Response("Access denied.", status=status.HTTP_400_BAD_REQUEST)

        case = current_user.cases.get(id=case_id)
        if case is None:
            return Response("Case not found or access denied.", status=status.HTTP_400_BAD_REQUEST)

        params = request.POST
        received_file = request.FILES['evidence_file']

        logging.getLogger('root').debug(f'Recevied file:{received_file.name}')

        file_obj = received_file.file

        app_storage = FileSystemStorage(location=config.STORAGE)

        target_location = os.path.join(f'Case_{case_id}', 'evidences', received_file.name)
        
        if app_storage.exists(target_location): #File with the same name previously sent. Renames the file with a sufix.
            extension_dot = target_location.rindex('.')

            #Tenta gerar um novo nome para o arquivo com sufixos numéricos até encontrar um nome não existente
            #--------------------------------
            for i in range(1,100):
                new_location = target_location[:extension_dot] + f'({i})' + target_location[extension_dot:]
                if not(app_storage.exists(new_location)):
                    target_location = new_location
                    break
            #--------------------------------
        
        try:
            with transaction.atomic():
                #salva o arquivo no storage
                file_location = app_storage.save(target_location, file_obj)
                received_file_size = app_storage.size(file_location)

                status = EvidenceFile.Status.RECEIVED
                result_hash = get_sha256_hash(app_storage, file_location)
                provided_hash = params['hash'].strip().lower()

                print(f"Hash {result_hash}")
                if result_hash != provided_hash:
                    status = EvidenceFile.Status.ERROR_HASH

                filename = os.path.split(file_location)[-1]

                #cria o registro para o novo documento no banco de dados
                evidence = EvidenceFile.objects.create(filename=filename, filesize=received_file_size, hash=provided_hash, case=case, status=status)
                
                case.status = Case.Status.FILES_RECEIVED
                case.save()

                history = EvidenceHistory.objects.create(
                    evidence_file=evidence,
                    operation=EvidenceHistory.Operation.UPLOADED,
                    case=case,
                    user=request.user
                )
                Blockchain.create_block(history)
              
                #Reads the whole case again, in order to show updates evicence file list and history
                case = current_user.cases.get(id=case_id)
                if case is None:
                    return Response("Case not found or access denied.", status=status.HTTP_400_BAD_REQUEST)
                
                serializer = CaseDetailsSerializer(case)
            
                return Response(serializer.data)
                
        except Exception as e:
            logging.getLogger('root').info(f'Failure creating evidence file at {target_location}. ')
            
            try:
                if app_storage.exists(target_location):
                    logging.getLogger('root').info(f'File had already been saved to storage and will be deleted from {target_location}. ')
                    app_storage.delete(target_location)
            except Exception as e2:
                logging.error('Failure deleting file from storage.', e2)
            
            raise e


def download_evidence_file(self, request, evidence_file):
    
    app_storage = FileSystemStorage(location=config.STORAGE)

    target_location = os.path.join(f'Case_{evidence_file.case_id}', 'evidences', evidence_file.filename)

    # Open the file from storage
    file = app_storage.open(target_location, 'rb')

    #Get the file extension
    file_extension = os.path.splitext(evidence_file.filename)[1]

    # Infer the content type based on the file extension
    content_type = mimetypes.types_map.get(file_extension, 'application/octet-stream')

    # Create an HTTP response with the file content and the appropriate content type
    response = HttpResponse(file.read(), content_type=content_type)

    # Set the content disposition to attachment so that the file is downloaded
    response['Content-Disposition'] = f'attachment; filename="{evidence_file.filename}"'

    return response


class EvidenceHistoryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get(self, request, case_id, evidence_id=None):
        current_user =  AppUser.objects.get(user__id=request.user.id)

        case = current_user.cases.get(id=case_id)
        if case is None:
            return Response("Case not found or access denied.", status=status.HTTP_400_BAD_REQUEST)

        history = case.history.all().order_by("id")

        serializer = HistorySerializer(history, many=True)

        return Response(serializer.data)