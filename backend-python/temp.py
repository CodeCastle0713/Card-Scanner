import requests

# Replace with your OCR.space API key
api_key = 'K82107706688957'

# API endpoint
url = 'https://api.ocr.space/parse/image'

# Path to your image file
image_path = 'Card Images/9.png'

# Open the image file
with open(image_path, 'rb') as image_file:
    # Define the payload and files
    payload = {'apikey': api_key}
    files = {'file': image_file}
    
    # Send the POST request
    response = requests.post(url, data=payload, files=files)
    
    # Parse the JSON response
    result = response.json()

# Print the extracted text
print(result['ParsedResults'][0]['ParsedText'])
