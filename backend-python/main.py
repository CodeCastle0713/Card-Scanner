import easyocr
import re
import base64
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter
from collections import defaultdict
import socketserver
from http.server import BaseHTTPRequestHandler
import json
import numpy as np

# Initialize EasyOCR Reader
reader = easyocr.Reader(['en'])

# Function to read text from an image with details
def read_text_from_image(image_path):
    results = reader.readtext(image_path, detail=1)
    return results

# Function to group text lines by their vertical position (Y-coordinate)
def group_lines_by_y(results, tolerance=10):
    lines = defaultdict(list)
    for bbox, text, _ in results:
        y_coords = [point[1] for point in bbox]
        avg_y = sum(y_coords) / len(y_coords)
        found = False
        for key in lines:
            if abs(avg_y - key) < tolerance:
                lines[key].append(text)
                found = True
                break
        if not found:
            lines[avg_y].append(text)
    return lines

# Function to clean and concatenate text lines
def extract_text_lines(lines):
    unwanted_words = ["VISA", "visa", "Visa", "credit", "CREDIT", "Credit", "debit", "DEBIT", "Debit", "gold", "Gold", "GOLD", "signature", "mastercard", "MasterCard", "MASTERCARD"]
    text_lines = []
    for y in sorted(lines.keys()):
        # Join all pieces of text in the same vertical group
        line_text = ' '.join(lines[y])
        # Remove unwanted words
        for word in unwanted_words:
            line_text = line_text.replace(word, '')
        # Optionally clean extra spaces after removal
        line_text = ' '.join(line_text.split())
        text_lines.append(line_text)
    return text_lines

# Function to extract card information from text lines
def extract_card_info_from_lines(text_lines):
    card_number_pattern = r'\d{4} \d{4} \d{4} \d{4}'
    # cvv_pattern = r'\d{3,4}'
    expiration_date_pattern = r'\d{2}/\d{2}|\d{2}-\d{2}'
    name_pattern = r'[A-Za-z.\- ]+'  # Updated pattern to include periods and hyphens

    extracted_info = {'card_number': None, 'expiration_date': None, 'cardholder_name': None}

    for line in text_lines:
        if re.search(card_number_pattern, line):
            extracted_info['card_number'] = re.search(card_number_pattern, line).group()
        # elif re.search(cvv_pattern, line):
        #     extracted_info['cvv'] = re.search(cvv_pattern, line).group()
        elif re.search(expiration_date_pattern, line):
            extracted_info['expiration_date'] = re.search(expiration_date_pattern, line).group()
        elif re.search(name_pattern, line):
            extracted_info['cardholder_name'] = re.search(name_pattern, line).group()

    return extracted_info

def preprocess_image(image):
    # Convert to grayscale
    image = image.convert('L')
    
    # Apply Gaussian Blur to reduce noise
    image = image.filter(ImageFilter.GaussianBlur(radius=1))
    
    # Increase contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.5)
    
    # Apply adaptive thresholding (using OpenCV via numpy arrays)
    image = Image.fromarray(np.array(image))
    image = image.point(lambda p: p > 100 and 255)  # Simple thresholding
    image = image.filter(ImageFilter.MedianFilter(size=3))
    
    # Further sharpen the image to make edges more distinct
    image = image.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    
    return image

# Function to decode base64 image and save as a temporary file
def decode_base64_image(base64_str):
    image_data = base64.b64decode(base64_str)
    image = Image.open(BytesIO(image_data))
    processedImage= preprocess_image(image)
    return processedImage
    # return image

# Main function to process base64 image and extract card information
def process_card_image_from_base64(base64_str):
    image = decode_base64_image(base64_str)
    # Save the image to a temporary file
    temp_image_path = 'temp_image.png'
    image.save(temp_image_path)
    
    results = read_text_from_image(temp_image_path)
    lines = group_lines_by_y(results)
    text_lines = extract_text_lines(lines)
    print(text_lines)
    card_info = extract_card_info_from_lines(text_lines)
    
    # Clean up temporary file
    # import os
    # os.remove(temp_image_path)
    
    return card_info

class MyHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        # Respond to OPTIONS request (preflight)
        self.send_response(204)  # No Content
        self._set_cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path == '/captureImage':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                # Decode JSON data
                data = json.loads(post_data)
                image_data = data.get('image')
                card_info = process_card_image_from_base64(image_data)

                self.send_response(200)  # Success
                self._set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(card_info).encode('utf-8'))

            except Exception as e:
                self.send_response(500)  # Internal Server Error
                self._set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

httpd = socketserver.TCPServer(("", 8080), MyHandler)
httpd.serve_forever()