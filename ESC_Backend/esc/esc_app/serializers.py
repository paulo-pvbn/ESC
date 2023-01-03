from .models import *
from rest_framework import serializers

class CaseListSerializer(serializers.ModelSerializer):
    status_desc = serializers.CharField(source='get_status_display')

    class Meta:
        model = Case
        fields = ['id', 'name', 'status', 'status_desc']

class UserField(serializers.RelatedField):
    def to_representation(self, value):
        result = {
            'id': value.id,
            'username': value.username,
            'fullname': value.first_name + (" " + value.last_name if value.last_name is not None else "")
        }
        return result

class EvidenceFileField(serializers.RelatedField):
    def to_representation(self, value):
        return {
            'id': value.id,
            'filename': value.filename
        }

class EvidenceFileSerializer(serializers.ModelSerializer):
    status_desc = serializers.CharField(source='get_status_display')
    filesize_mb = serializers.SerializerMethodField()

    class Meta:
        model = EvidenceFile
        fields = ['id', 'filename', 'filesize', 'filesize_mb', 'hash', 'status', 'status_desc']

    def get_filesize_mb(self, obj):
        return f"{round(obj.filesize / 1048576)} MB"

class HistorySerializer(serializers.ModelSerializer):
    operation_desc = serializers.CharField(source='get_operation_display')
    user = UserField(many=False, read_only=True)
    evidence_file = EvidenceFileField(many=False, read_only=True)

    class Meta:
        model = EvidenceHistory
        fields = ['id', 'operation', 'operation_desc', 'user', 'evidence_file', 'date']


class CaseDetailsSerializer(serializers.ModelSerializer):
    status_desc = serializers.CharField(source='get_status_display')
    creation_user = UserField(many=False, read_only=True)
    evidence_files = EvidenceFileSerializer(many=True, read_only=True)
    history = HistorySerializer(many=True, read_only=True)

    class Meta:
        model = Case
        fields = ['id', 'name', 'procedure_number', 'status', 'status_desc', 'creation_date', 'creation_user', 'evidence_files', 'history']


