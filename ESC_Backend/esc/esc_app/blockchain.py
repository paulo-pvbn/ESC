import hashlib
from dataclasses import dataclass
from django.utils import timezone
from .models import EvidenceHistory, BlockchainBlock

@dataclass
class Block:
    index: int
    timestamp: timezone.datetime
    data: EvidenceHistory
    previous_hash: str
    hash: str = ''

    def calculate_hash(self):
        sha = hashlib.sha256()
        sha.update(f"{self.index}{self.timestamp.isoformat()}{self.data.id}{self.previous_hash}".encode('utf-8'))
        self.hash = sha.hexdigest()
        return self.hash

class Blockchain:
    @staticmethod
    def get_last_block():
        try:
            return BlockchainBlock.objects.latest('index')
        except BlockchainBlock.DoesNotExist:
            return None

    @staticmethod
    def create_block(history: EvidenceHistory) -> Block:
        last_block = Blockchain.get_last_block()
        index = 1 if last_block is None else last_block.index + 1
        previous_hash = '0'*64 if last_block is None else last_block.hash
        timestamp = timezone.now()
        block = Block(index=index, timestamp=timestamp, data=history, previous_hash=previous_hash)
        block.calculate_hash()
        BlockchainBlock.objects.create(
            index=block.index,
            previous_hash=block.previous_hash,
            hash=block.hash,
            history=history,
            timestamp=timestamp
        )
        return block
