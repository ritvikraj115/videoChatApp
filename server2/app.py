from flask import Flask, request, jsonify
import base64
from io import BytesIO
import PIL.Image
import numpy as np
from flask_cors import CORS
import google.generativeai as genai
# from dotenv import load_dotenv
import os

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

# load_dotenv() ## load all environment variables from .env

genai.configure(api_key='AIzaSyDT9deUrGuYd3uT4DkArYLapxgLHDs_mMY')

@app.route('/process-frame', methods=['POST'])
def process_frame():
    data = request.json['frame']
    # image = Image.open(BytesIO(image_data))

    if data is not  None:
        if data.startswith("data:"):
            data = data.split(",")[1] # Extract Base64 part

            image_data = base64.b64decode(data)
            image = PIL.Image.open(BytesIO(image_data))
        # bytes_data=uploaded_file.getvalue()
        # image_parts= [
        #     {
        #         "mime_type":'image/jpeg',
        #         "data":image_data
        #     }
        # ]
        # final_img=image_parts[0]
        # print(final_img)
            input_propmt="""
          You are analyzing single still images of a person's body and facial expressions. Your task is to determine and output the most relevant one-word expression or emotion based on the given still image. 

            Please provide only a single word that best represents the expression or emotion in the image, such as "hello," "ok," "sorry," "thank you," or similar.

            Example Input:
            - Still Image 1: [Image showing body and facial expressions]

            Expected Output:
            - Still Image 1: "hello"

            Focus on providing concise one-word responses based on the observed expression in the image, without requiring additional context or descriptions."

            """

            model=genai.GenerativeModel('gemini-1.5-flash')
            response=model.generate_content([input_propmt, image])
            return jsonify(response.text)
    else:
        raise FileNotFoundError("no file uploaded")
        






# def get_gemini_response(image,input):
    

# def input_image_setup(uploaded_file):
#     if uploaded_file is not  None:
#         bytes_data=uploaded_file.getvalue()
#         image_parts= [
#             {
#                 "mime_type":uploaded_file.type,
#                 "data":bytes_data
#             }
#         ]
#         return image_parts[0]
#     else:
#         raise FileNotFoundError("no file uploaded")

        # # input= st.text_input("Input Prompt: ",key="input")
        # uploaded_file=st.file_uploader("Choose an image...",type=["jpg","jpeg","png"])
        # image=""
        # if uploaded_file is not None:
        #     image= Image.open(uploaded_file)
        #     st.image(image,caption='Uploaded Image:',use_column_width=True)
        # submit=st.button("Process")
        


if __name__ == '__main__':
    app.run(debug=True)
