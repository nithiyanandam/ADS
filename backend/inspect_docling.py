from docling.document_converter import DocumentConverter
import tempfile
import os

# Create a dummy PDF file (empty) just to get the object, or just check the class
# Actually, let's just check the class of the result document if possible without a real file.
# But convert() needs a file.
# I'll just print the attributes of the Document class if I can import it directly.

try:
    from docling.datamodel.document import DoclingDocument
    print("Methods of DoclingDocument:")
    for method in dir(DoclingDocument):
        if method.startswith("export_"):
            print(method)
except ImportError:
    print("Could not import DoclingDocument directly. Trying converter flow...")
    # This might fail if no file, but let's try to just check the valid exports
    pass
