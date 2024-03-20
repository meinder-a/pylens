document.addEventListener('DOMContentLoaded', () => {
    const domainForm = document.getElementById('domainForm');
    const loadingScreen = document.getElementById('loadingScreen');
    const alertBox = document.getElementById('alert');
    const searchButton = document.getElementById('searchButton');

    domainForm.addEventListener('submit', (e) => handleSubmit(e, searchButton));

    function handleSubmit(event, button) {
        event.preventDefault();
        const imageURL = document.getElementById('image_url').value;
        const resultCount = document.getElementById('result_count').value;

        toggleVisibility(loadingScreen);
        toggleVisibility(alertBox, true);

        fetchAndDisplayResults(imageURL, resultCount)
            .catch(handleError)
            .finally(() => {
                toggleVisibility(loadingScreen, true);
            });
    }

    function fetchAndDisplayResults(imageURL, resultCount) {
        return fetch('/fetch-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `image_url=${encodeURIComponent(imageURL)}&result_count=${encodeURIComponent(resultCount)}`
        })
            .then(response => response.json())
            .then(data => displayResults(data, resultCount))
    }

    function displayResults(imageData, resultCount) {
        const resultsContainer = document.getElementById('imagesResult');
        resultsContainer.innerHTML = '';

        if ('message' in imageData) {
            handleError(imageData.message);
            toggleVisibility(resultsContainer);
            return;
        } else {
            showSuccessAlert()
        }

        const maxResults = resultCount === 'unlimited' ? imageData.length : parseInt(resultCount);
        for (let i = 0; i < maxResults; i++) {
            if (imageData[i]) {
                resultsContainer.appendChild(createImageElement(imageData[i]));
            }
        }
        toggleVisibility(resultsContainer);
    }

    function createImageElement(data) {
        const element = document.createElement('div');
        element.className = 'shadow overflow rounded-lg p-4 card-transition bg-gray-850';

        // Image
        const image = document.createElement('img');
        image.src = data.image_url || '';
        image.alt = 'Image';
        image.className = 'max-h-64 w-auto mx-auto';
        image.onerror = "this.onerror=null; this.src='fallback-image.jpg'"
        element.appendChild(image);

        // Details
        const details = createDetailsElement(data);
        element.appendChild(details);

        return element;
    }

    function createDetailsElement(data) {
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'image-details';

        const languageInfo = document.createElement('span');
        languageInfo.textContent = `Language: ${data.language}`;
        detailsContainer.appendChild(languageInfo);

        if (data.image_url) {
            const viewImageLink = createLinkElement(data.image_url, 'View Image');
            detailsContainer.appendChild(viewImageLink);
        }

        if (data.reference_url) {
            const viewPageLink = createLinkElement(data.reference_url, 'View Page');
            detailsContainer.appendChild(viewPageLink);

            let domain = (new URL(data.reference_url)).hostname;
            if (! domain.startsWith("http")) {
                domain = "http://" + domain;
            }
            
            const domainLabel = createLinkElement(domain, domain)
            detailsContainer.appendChild(domainLabel);
        }

        return detailsContainer;
    }

    function createLinkElement(href, text) {
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = text;
        return link;
    }

    function handleError(error) {
        console.error('Error:', error);
        showAlert('Error', error.toString(), 'red');
    }

    function showSuccessAlert(foo) {
        console.log(foo);
        showAlert('Success', 'See images below', 'green');
    }

    function resetAlert() {
        toggleVisibility(document.getElementById('alert'));
    }

    function showAlert(title, body, color = 'blue') {
        const regex = /^(bg|border|text)-.*$/; // Regex to match classes starting with 'bg-' or 'border-'
        const alertTitle = document.getElementById('alert-title');
        removeClassesByRegex(alertTitle, regex);
        const alertBody = document.getElementById('alert-body');
        removeClassesByRegex(alertBody, regex);
        alertTitle.textContent = title;
        alertTitle.classList.add('bg-' + color + '-600')
        alertBody.textContent = body;
        alertBody.classList.add('border-' + color + '-600')
        alertBody.classList.add('bg-' + color + '-200')
        alertBody.classList.add('text-' + color + '-600')
        toggleVisibility(document.getElementById('alert'));
    }

    function removeClassesByRegex(element, regex) {
        const classes = Array.from(element.classList);

        classes.forEach(cls => {
            if (regex.test(cls)) {
                element.classList.remove(cls);
            }
        });
    }

    function toggleVisibility(element, hide = false) {
        element.classList.toggle('hidden', hide);
    }
});

// Local time and city functionality
function getCity() {
    fetch('https://ipapi.co/json/')
        .then(response => response.json())
        .then(data => updateLocation(data.city))
        .catch(error => console.error('Error fetching location data:', error));
}

function updateLocation(city) {
    const locationDiv = document.getElementById('location');
    locationDiv.innerHTML = `Your location: ${city}<br>Local time: <span id="currentTime"></span>`;
    updateLocalTime();
    setInterval(updateLocalTime, 1000);
}

function updateLocalTime() {
    const currentTime = new Date().toLocaleTimeString('fr-FR', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    document.getElementById('currentTime').textContent = currentTime;
}

getCity();
