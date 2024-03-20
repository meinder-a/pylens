#!/usr/bin/env python3
import os
import sys
import json
from time import time, sleep
from base64 import b64encode
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, parse_qs, unquote, quote
from io import BytesIO

def load_image_from_url(url):
    response = requests.get(url)
    if response.status_code == 200:
        return BytesIO(response.content)
    else:
        raise Exception(f"Error fetching image from {url}: Status code {response.status_code}")

def post_image_and_get_response_html(image_url, lang):
    headers = {
        'Cookie': 'NID=511=eoiYVbD3qecDKQrHrtT9_jFCqvrNnL-GSi7lPJANAlHOoYlZOhFjOhPvcc'
                  '-43ZSGmBx_L5D_Irknb8HJvUMo41sCh1i0homN3Taqg2z7mdjnu3AQe-PbpKAyKE4zW1'
                  '-N6niKTJAMkV6Jq4AWPwp6txH_c24gjt7fU3LWAfNIezA'
    }
    timestamp = int(time() * 1000)
    url = f'https://lens.google.com/v3/upload?hl={lang}&re=df&stcs={timestamp}&vpw=1500&vph=1500'

    file_content = load_image_from_url(image_url)
    files = {'encoded_image': (image_url, file_content, 'image/jpeg')}
    response = requests.post(url, files=files, headers=headers)

    return response.text if response.status_code == 200 else None


def extract_image_urls(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    divs = soup.find_all('div', class_='Vd9M6')

    if not divs:
        print("Error: The expected content is not found on the page. This might be due to a change in the website's "
              "layout. Please report this issue for further assistance.")
        return []

    problematic_domains = ['yandex.com', 'yandex.ru', 'instagram.com', 'facebook.com', 'fbsbx.com', 'tiktok.com']

    image_urls = []
    for div in divs:
        action_url = div.get('data-action-url')
        if action_url:
            parsed_url = urlparse(action_url)
            query_params = parse_qs(parsed_url.query)
            img_url = unquote(query_params.get('imgurl', [None])[0])
            img_ref_url = unquote(query_params.get('imgrefurl', [None])[0])

            img_is_problematic = any([p in img_url for p in problematic_domains])
            if img_url.startswith('x-raw-image') or img_is_problematic:
                div_thumb = div.find(lambda tag:tag.name == "div" and 'data-thumbnail-url' in tag.attrs)
                img_url = div_thumb.get('data-thumbnail-url')

            print(f"Working on image {img_url} from {img_ref_url}")
            image_urls.append((img_url, img_ref_url))

    return image_urls


def normalize_url(url):
    parsed_url = urlparse(url)
    url_path = os.path.dirname(parsed_url.path)
    normalized_path = quote(url_path)
    normalized_url = f'{parsed_url.scheme}://{parsed_url.netloc}{normalized_path}'
    return normalized_url


def filter_unique_images(image_urls, processed_urls, lang):
    unique_images = []
    for img_url, img_ref_url in image_urls:
        normalized_url = normalize_url(img_url)
        if normalized_url not in processed_urls:
            processed_urls.add(normalized_url)
            unique_images.append((img_url, img_ref_url, lang))
    return unique_images


def read_langs(file_path):
    if os.path.exists(file_path):
        with open(file_path) as file:
            return [line.strip() for line in file.readlines()]
    else:
        print(f"Language file not found: {file_path}")
        return None


def get_base64_image_uri(image_url, file_content):
    img_type = 'image/png' if image_url.endswith('.png') else 'image/jpeg'
    img_encoded = b64encode(file_content).decode()

    return f"data:{img_type};base64,{img_encoded}"

def search_image(image_url, langs):
    processed_urls = set()
    all_images = []

    for lang in langs:
        try:
            html_content = post_image_and_get_response_html(image_url, lang)
            if html_content:
                image_urls = extract_image_urls(html_content)
                unique_images = filter_unique_images(image_urls, processed_urls, lang)
                for img in unique_images:
                    all_images.append({
                        'image_url': img[0],
                        'reference_url': img[1],
                        'language': lang
                    })
        except Exception as e:
            print(f"Error: {e}")

    return all_images

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("nope, it needs an image!")
        exit()

    image_url = sys.argv[1]

    langs = read_langs('langs.txt') or ['fr', 'en', 'ru', "il"]
    images = search_image(image_url, langs)
    print(json.dumps(images))
