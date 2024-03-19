from flask import Flask, request, render_template, jsonify
import main  # Import your existing main.py script

app = Flask(__name__)

langs = main.read_langs('langs.txt') or ['fr', 'en', 'ru', "il"]

@app.route('/', methods=['GET', 'POST'])
def index():
    return render_template('index.html')

@app.route('/fetch-data', methods=['POST'])
def fetch_data():
    image_url = request.form['image_url']
    images = main.search_and_generate_report(image_url, langs)  # Modify languages as needed
    return jsonify(images)

if __name__ == '__main__':
    app.run(debug=True)
