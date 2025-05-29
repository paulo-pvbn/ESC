from django.test import TestCase
from .models import *
from django.contrib.auth.models import User
from .blockchain import Blockchain, BlockchainBlock

class ESCTestCase(TestCase):

    def setUp(self):
        user = User.objects.create_user(username='officer01', email='officer@police.gov.br', password='achtung')
        # Create your tests here.
        case = Case(name="A test case", procedure_number="12345", creation_user=user)
        case.save()
        self.case = case
        self.user = user
        self.evidence = EvidenceFile.objects.create(
            filename="file.txt",
            filesize=10,
            hash="dummyhash",
            case=case,
            status=EvidenceFile.Status.RECEIVED,
        )

    def test_case_initial_status(self):
        case = Case.objects.get(name="A test case")
        self.assertEqual(case.status, Case.Status.NO_DATA)

    def test_blockchain_chain(self):
        history1 = EvidenceHistory.objects.create(
            case=self.case,
            evidence_file=self.evidence,
            user=self.user,
            operation=EvidenceHistory.Operation.UPLOADED,
        )
        block1 = Blockchain.create_block(history1)

        history2 = EvidenceHistory.objects.create(
            case=self.case,
            evidence_file=self.evidence,
            user=self.user,
            operation=EvidenceHistory.Operation.DOWNLOADED_BY_USER,
        )
        block2 = Blockchain.create_block(history2)

        self.assertEqual(block1.hash, BlockchainBlock.objects.get(index=1).hash)
        self.assertEqual(block2.previous_hash, block1.hash)
