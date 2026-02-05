from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
import os
import random
import string

def create_text_pdf(filename, title, content_map):
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, title)
    
    y = height - 100
    c.setFont("Helvetica", 10)
    
    for key, value in content_map.items():
        if y < 100:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 10)
            
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, f"{key}:")
        
        # Simple text wrapping for demo
        text_object = c.beginText(150, y)
        text_object.setFont("Helvetica", 10)
        
        # Split into chunks of 80 chars
        chunks = [value[i:i+80] for i in range(0, len(value), 80)]
        for chunk in chunks:
            text_object.textLine(chunk)
            y -= 12
            
        c.drawText(text_object)
        y -= 20
        
    c.save()

def generate_random_string(length):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

output_dir = "sample_pdfs_large"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Set 1: Long Text Blocks (Policy)
lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 20
lorem_modified = lorem.replace("consectetur", "CONSECTETUR_MODIFIED")

create_text_pdf(f"{output_dir}/Policy_Old.pdf", "Policy Terms (v1)", {
    "Term_1_Introduction": lorem,
    "Term_2_Privacy": lorem,
    "Term_3_Liability": "Standard liability clause applied."
})

create_text_pdf(f"{output_dir}/Policy_New.pdf", "Policy Terms (v2)", {
    "Term_1_Introduction": lorem,
    "Term_2_Privacy": lorem_modified, # Changed
    "Term_3_Liability": "Standard liability clause applied."
})

# Set 2: Large Keys (System Config)
long_key_1 = generate_random_string(300)
long_key_2 = generate_random_string(300)
long_key_2_mod = long_key_2[:-10] + "CHANGED123"

create_text_pdf(f"{output_dir}/Config_Old.pdf", "System Config (v1)", {
    "API_KEY_PRIMARY": long_key_1,
    "API_KEY_SECONDARY": long_key_2,
    "CERTIFICATE_PAYLOAD": generate_random_string(500)
})

create_text_pdf(f"{output_dir}/Config_New.pdf", "System Config (v2)", {
    "API_KEY_PRIMARY": long_key_1,
    "API_KEY_SECONDARY": long_key_2_mod, # Changed end
    "CERTIFICATE_PAYLOAD": generate_random_string(500) # Changed completely (random)
})

# Set 3: Large Table Data
# (Using Platypus for tables as they are harder with raw canvas)
def create_table_pdf(filename, data):
    doc = SimpleDocTemplate(filename, pagesize=A4)
    elements = []
    
    styles = getSampleStyleSheet()
    elements.append(Paragraph("Financial Report", styles['Title']))
    
    t = Table(data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(t)
    doc.build(elements)

rows = [["ID", "Description", "Value", "Notes"]]
for i in range(1, 20):
    rows.append([f"ROW_{i}", f"Transaction item number {i} description", f"${i*1000}.00", "Verified"])

create_table_pdf(f"{output_dir}/Finance_Old.pdf", rows)

rows_new = [r[:] for r in rows] # Copy
rows_new[5][2] = "$99999.00" # Change value in row 5
rows_new[10][3] = "PENDING" # Change note in row 10

create_table_pdf(f"{output_dir}/Finance_New.pdf", rows_new)

print(f"Generated 6 PDFs in {output_dir}")
