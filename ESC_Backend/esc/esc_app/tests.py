from django.test import TestCase
from .models import *
from django.contrib.auth.models import User

class ESCTestCase(TestCase):

    def setUp(self):
        user = User.objects.create_user(username='officer01', email='officer@police.gov.br', password='achtung')
        # Create your tests here.
        case = Case(name="A test case", procedure_number="12345", creation_user=user)
        case.save()


    def test_case_initial_status(self):
        case = Case.objects.get(name="A test case")
        self.assertEqual(case.status, Case.Status.NO_DATA)
