from django.contrib import admin
from . import models

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

import logging
from logging.handlers import RotatingFileHandler

from .config import *

# Register your models here.

# Define an inline admin descriptor for Employee model
# which acts a bit like a singleton
class AppUserInline(admin.StackedInline):
    model = models.AppUser
    can_delete = False
    verbose_name_plural = 'esc_user'

# Define a new User admin
class UserAdmin(BaseUserAdmin):
    inlines = [AppUserInline]

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

admin.site.register(models.Case)
admin.site.register(models.ServiceProvider)

#Other app initialization
#Makes sure the storage folder for the app exist
os.makedirs(LOG_DIR, exist_ok=True)
log_file_path = os.path.join(LOG_DIR, 'esc_api_log')
print(f'Starting API. App log files will be generated at {LOG_DIR}')

#logging.basicConfig(filename=caminho_arquivo_log, encoding='utf-8', level=logging.DEBUG)

log_formatter = logging.Formatter('%(asctime)s %(levelname)s %(funcName)s(%(lineno)d) %(message)s')

my_handler = RotatingFileHandler(log_file_path, mode='a', maxBytes=5*1024*1024, 
                                backupCount=1000000, encoding=None, delay=0)
my_handler.setFormatter(log_formatter)
my_handler.setLevel(logging.DEBUG)

app_log = logging.getLogger('root')
app_log.setLevel(logging.DEBUG)

app_log.addHandler(my_handler)