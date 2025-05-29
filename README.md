# ESC - Evicence Secure Chain (CS50X Final Project)
#### Video Demo:  https://youtu.be/Dj480ySH9E0
#### Description:
ESC is a web application built as a collaboration to the final thesis of a Data Science masters degree currently (2022) in progress by a brazilian police officer, member of Brazil's Federal Police. Its first version was developed as a Final Project for 2022 Harvard CS50x.

The intent of the thesis is to use technology to preserve the chain of custody of material that e-mail and cloud service providers send to federal agencies in response to lifting of secrecy justice decisions concerning e-mail and cloud data.

The web application presented here provides basic funcionality for government agency officers, internet servide providers employees and other parties with the proper justice authorization to work with the mentioned material in a manner that preserves the chain of custody.

The application built here provides the following basic funcionalities:
* Secure environment for three user profiles: 
    - Government Agency Officer: Able to create new cases and grant access to the other two user profiles
    - Employee of Internet Service Provider: Able to submit secret files in response to justice decisions
    - Lawyer: Able to visualize secret files, given the proper judicial authorization. Usually this authorization will be granted after the operation becomes public and search warrants or arrests have already been performed by the police or other government agencies.

    All profiles can visualize secret files. Criminal investigators or analysts, with the profile of Government Agency Officers will be able to download the files to perform data analysis in order to produce evidence in the context of a criminal investigation.

* Secure file upload and download of files in the context of lifting of secrecy of e-mail and cloud storage. 

* SHA256 hash check for all files. The service provider employee that uploads the file fills in a form with the proper hash so the system can check it upon reception. The hash is stored in the database for future checking for any party that intends to use the file.

* Logging of every access to the files (called evicence files), including the upload made my the employee of the servide provider and all downloads by government officers and private lawyers

#### Architecture:
* Front end with HTML, JavaScript and CSS
    - Use of HTML5 features such as client side validations and feedback from server side validations.
    - Mostly pure CSS with some bootstrap components such as collapse, modal and navigation tabs
    - Single page application using pure JavaScript with no front end framework (Not recommended, and will be replaced by React in future versions. Was a good experiment though).

* Back end with Python, Django, Django REST and Simple JWT
    - REST API using views inherited directly from rest_framework.views.APIView
    - Pure Django ORM, with migrations. Need future improvements with the creation of indexes.

* PostgreSQL for relational database access.

#### File Structure:
* ESC
    * docker
        - docker-compose.yml: Used to create and start the postgreSQL docker container with a volume binding to a local folder.
        * esc_db: 
            - Dockerfile: Creates the postgreSQL image and runs a script to create a database named esc
            - env.db: Env file with database name, username and password to use in the image build process. Could be used by a future django docker image.
            * data: Local volume in whitch the postgres database will be stored
            * scripts: 
                -  init.sql: Basis db settings
* ESC_Backend
    * esc: manage.py and rest of django project structure
        * esc: django project
            - settings.py: Configurations for db connections and JWT. Should be customized with db access data or environment variables should be populated before running django.
        * esc_app: django_app
            * log: folder for logging files
            - admin.py: registered modules in order to allow some operations such as user registry and case access control to be performed using django admin.
            - config.py: configuration of folders for file storage and logging.
            - helpers.py: functions for SHA256 hash generation.
            - models.py: Django models and functions relating to ORM database manipulation.
            - serializers.py: Django REST serializers
            - urls.py: uri paths for all the REST APIs
            - views.py: Django REST APIView classes for all the REST APIs.
        * static: HTML and CSS files served by Django
            * images
            * styles
                - Roboto-Regular.ttf - Google Font
                - styles.css - application CSS file
            - case_details.html: Legacy template
            - cases.html: Legacy template
            - index.html - Legacy entry point
            - login.html - Legacy login component
            - logo.svg - Logo for the application menu
            - package.json - required node_modules
            - register.html - Template for the future register form
        * templates: Django templates rendered by views (index and login)
            - base.html
            - index.html
            - login.html
        * storage: Preconfigured storage folder where evidence files will be stored. This location can be changed to any folder by manipulating config.py.
    - requirements.txt: Python requirements to be used with python -m pip install -r requirements.txt
    - ESC.code-workspace: VSCode workspace file in order to facilitate dev environment creation
    - blockchain_gui.py: Simple Tkinter interface to view case history through the REST API

#### Setup:
##### Create and run the postgreSQL instance:
- cd ESC\docker
- docker compose up -d

##### Install the python packages in the selected venv:
- cd ..\ESC_Backend
- python -m pip install -r requirements.txt

##### Migrate the database using django:
- cd esc (folder that contains manage.py)
- python manage.py makemigrations
- python manage.py migrate

##### Create django superuser:
- python manage.py createsuperuser
- Follow prompt instructions

##### Start Django:
- python manage.py runserver

##### Create users with the desired profiles:
- Access http://localhost:8000/admin
- Login with the credentials provided in the "createsuperuser" step
- In the "AUTHENTICATION AND AUTHORIZATION" section, select the "+ Add" button besides "Users"
- Fill in username, password, first name, last name, profile and company name.
- If a case already existed, one could use this form to grant access to a case

##### Using the application:
- Open http://localhost:8000/esc/login/ and authenticate with a user created with the django admin.
- After login you will see a list of cases rendered by Django templates.
- Alternatively, run `python blockchain_gui.py` to open a Tkinter interface for browsing
  case history using the REST API.


#### Future Updates:
For future updates to ESC - Evidence Secure Chain, please check my GitHub page on https://github.com/fercele

* Future short term improvements planned for future released
    - For this release, user registration and access control data (granting access to cases) are performed using the django admin tool. The system should have a registration form and another for the government officer to grant access to the case to other users.
    - Since many files in these context (mailboxes and cloud backups) are very large, simple http upload will not be enough for many situations, so the system will have a for for the service provider to inform an url and access key for a system daemon to automatically perform the download, and hash checking as a batch process.
    - The front end was developed as a single page pure JavaScript implementation, so it became big and complex. I wanted to experiment with my newly aquired JavaScript foundation knowledge so instead of using Angular, with whitch I had experience, I decided to go pure JavaScript and intend to learn REACT and convert the frontend to this framework, since I belevie it is better suited for this kind (size) of project than Angular.
    - Deployment of static files to a proper HTTP Web Server such as NGINX, plugged to Django thgough gunicorn for more effective and scallable static file serving. Django will also be in its own docker container.
    - Use docker secrets and not env files for db username and passwords.

* Future long term improvements in the context of the masters thesis of my colleague:
    - Pure logging and hash checking is not fail proof for ensuring the custody chain, so the plan is to employ blockchain technology for this end.
