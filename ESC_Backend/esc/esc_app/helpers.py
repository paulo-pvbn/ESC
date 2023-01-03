import hashlib


def get_sha256_hash(app_storage, filepath):
    """
    Function below generated with ChatGPT. Very similar code to the one found in StackOverflow
    """
    # Open the file in binary mode
    with app_storage.open(filepath, 'rb') as file:
        # Create a hash object
        hash_obj = hashlib.sha256()

        # Read the file in chunks and update the hash
        while True:
            chunk = file.read(8192)
            if not chunk:
                break
            hash_obj.update(chunk)

        # Return the hexadecimal representation of the hash
        return hash_obj.hexdigest()
