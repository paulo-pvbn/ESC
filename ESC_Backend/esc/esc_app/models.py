from django.db import models
from django.conf import settings
from django.contrib.auth.models import User

# Create your models here.

class Case(models.Model):
    class Meta:
        db_table = 'cases'
    
    class Status(models.IntegerChoices):
        NO_DATA = 0, 'No Data'
        PENDING_FILES = 1, 'Awaiting Files'
        FILES_RECEIVED = 2, 'Files Received'

    name = models.CharField(max_length=100)
    procedure_number = models.CharField(max_length=100, null=True)
    status = models.IntegerField(choices=Status.choices, default=Status.NO_DATA)

    creation_date = models.DateTimeField(auto_now_add=True)
    creation_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_cases")

    def __str__(self):
        return f"{self.name} ({str(self.id).zfill(5)})"


class ServiceProvider(models.Model):
    class Meta:
        db_table = 'servide_provider'

    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} ({self.id})"

class AppUser(models.Model):
    class Meta:
        db_table = 'app_user'
        
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    class Profile(models.IntegerChoices):
        GOV_AGENT = 1, 'Government Agent'
        SERVICE_PROVIDER = 2, 'Servide Provider'
        LAWYER = 3, 'Lawyer'

    profile = models.IntegerField(choices=Profile.choices, null=False)
    company_name = models.CharField(max_length=100)

    #Field below only set for users with profile SERVICE_PROVIDER
    service_provider = models.ForeignKey(ServiceProvider, on_delete=models.SET_NULL, blank=True, null=True)

    #Access control of users to cases
    cases = models.ManyToManyField(Case, blank=True, related_name="users_with_access", db_table="cases_access_control")

    def __str__(self):
        return f"{self.id} - {self.user} - Profile: {self.profile}, Company: {self.company_name}"


class EvidenceFile(models.Model):

    class Meta:
        db_table = 'evidence_file'

    class Status(models.IntegerChoices):
        PENDING = 0, 'No Data'
        DOWNLOAD_IN_PROGRESS = 1, 'Download In Progress'
        RECEIVED = 2, 'File Received and Checked'
        ERROR_TRANSMISSION = 3, 'Error in File Transmission'
        ERROR_HASH = 4, 'Error validating against Hash'

    filename = models.CharField(max_length=100)
    filesize = models.IntegerField()
    #sha_256 hash from the files
    hash = models.CharField(max_length=256)

    status = models.IntegerField(choices=Status.choices, default=Status.PENDING)

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="evidence_files")

    def __str__(self):
        return f"{self.id} - {self.filename} ({round(self.filesize / 1048576, 2)}MB) {self.status}"


class EvidenceHistory(models.Model):
    class Meta:
        db_table = 'evidence_history'

    class Operation(models.IntegerChoices):
        UPLOADED = 0, 'Uploaded by user',
        REGISTERED_FOR_DOWNLOAD = 1, 'Registered for Download',
        DOWNLOADED_BY_SYSTEM = 2, 'Downloaded into Database and Checked',
        DOWNLOADED_BY_USER = 3, 'Downloaded by user'
    
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="history")
    evidence_file = models.ForeignKey(EvidenceFile, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateTimeField(auto_now_add=True)
    operation = models.IntegerField(choices=Operation.choices)

    def __str__(self):
        return f"{self.id} - case: {self.case_id} - evidence {self.evidence_file_id} - operation {self.operation}"

