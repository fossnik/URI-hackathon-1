// DOM Elements
const inputText = document.getElementById('inputText');
const sampleBtn = document.getElementById('sampleBtn');
const extractBtn = document.getElementById('extractBtn');
const extractBtnText = document.getElementById('extractBtnText');
const extractBtnLoader = document.getElementById('extractBtnLoader');
const eventsSection = document.getElementById('eventsSection');
const eventsList = document.getElementById('eventsList');
const generateIcsBtn = document.getElementById('generateIcsBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');

// State
let extractedEvents = [];

// Sample data for testing
const SAMPLE_TEXT = `University Events Calendar

Technology Conference 2025
Join us for the Annual Technology and Innovation Conference on October 25, 2025 at 2:00 PM at the University Convention Center. Network with industry leaders and explore cutting-edge technologies.

Guest Lecture Series
Professor Jane Smith will present "The Future of AI" on November 3, 2025 at 4:30 PM in Science Hall Room 301.

Career Fair
The Fall Career Fair will be held on November 15, 2025 from 10:00 AM to 3:00 PM at the Student Union Building. Over 100 companies will be recruiting.

Hackathon 2025
URI Hackathon will take place December 1-2, 2025 starting at 5:00 PM at the Engineering Building. Registration opens November 1st.`;

// Sample Data Button
sampleBtn.addEventListener('click', () => {
    inputText.value = SAMPLE_TEXT;
    inputText.focus();
});

// Extract Events
extractBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    
    if (!text) {
        alert('Please enter some text to extract events from.');
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await fetch('/api/extract-events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.events && data.events.length > 0) {
                extractedEvents = data.events;
                displayEvents(data.events);
                eventsSection.style.display = 'block';
                eventsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('No events found in the text. Try different text or check your input.');
            }
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`Error extracting events: ${error.message}`);
    } finally {
        setLoading(false);
    }
});

function setLoading(loading) {
    extractBtn.disabled = loading;
    if (loading) {
        extractBtnText.style.display = 'none';
        extractBtnLoader.style.display = 'inline-block';
    } else {
        extractBtnText.style.display = 'inline';
        extractBtnLoader.style.display = 'none';
    }
}

// Display Events
function displayEvents(events) {
    eventsList.innerHTML = '';
    
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card selected';
        card.dataset.id = event.id;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'event-checkbox';
        checkbox.checked = true;
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        const title = document.createElement('div');
        title.className = 'event-title';
        title.textContent = event.summary;
        
        const details = document.createElement('div');
        details.className = 'event-details';
        
        // Format date/time
        const dateTime = new Date(event.startDateTime);
        const dateTimeStr = dateTime.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        const dateDetail = document.createElement('div');
        dateDetail.className = 'event-detail';
        dateDetail.innerHTML = `<span class="event-detail-icon">📅</span><span>${dateTimeStr}</span>`;
        details.appendChild(dateDetail);
        
        if (event.location) {
            const locationDetail = document.createElement('div');
            locationDetail.className = 'event-detail';
            locationDetail.innerHTML = `<span class="event-detail-icon">📍</span><span>${event.location}</span>`;
            details.appendChild(locationDetail);
        }
        
        if (event.description) {
            const descDetail = document.createElement('div');
            descDetail.className = 'event-detail';
            descDetail.innerHTML = `<span class="event-detail-icon">📝</span><span>${event.description}</span>`;
            details.appendChild(descDetail);
        }
        
        card.appendChild(checkbox);
        card.appendChild(title);
        card.appendChild(details);
        
        // Click card to toggle checkbox
        card.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        
        eventsList.appendChild(card);
    });
}

// Select All Events
selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.event-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = true);
});

// Deselect All Events
deselectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.event-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = false);
});

// Generate ICS File
generateIcsBtn.addEventListener('click', () => {
    const selectedCheckboxes = document.querySelectorAll('.event-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Please select at least one event.');
        return;
    }
    
    const selectedIds = Array.from(selectedCheckboxes).map(cb => {
        return parseInt(cb.parentElement.dataset.id);
    });
    
    const selectedEvents = extractedEvents.filter(event => 
        selectedIds.includes(event.id)
    );
    
    const icsContent = generateIcs(selectedEvents);
    downloadIcs(icsContent);
});

function generateIcs(events) {
    let ics = 'BEGIN:VCALENDAR\r\n';
    ics += 'VERSION:2.0\r\n';
    ics += 'PRODID:-//AI Event Extractor//EN\r\n';
    ics += 'CALSCALE:GREGORIAN\r\n';
    ics += 'METHOD:PUBLISH\r\n';
    
    events.forEach(event => {
        const now = new Date();
        const dtstamp = formatIcsDateTime(now);
        
        // Parse the start date/time
        const startDate = new Date(event.startDateTime);
        const dtstart = formatIcsDateTime(startDate);
        
        // Default end time to 1 hour after start
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const dtend = formatIcsDateTime(endDate);
        
        ics += 'BEGIN:VEVENT\r\n';
        ics += `UID:${event.id}-${dtstamp}@ai-event-extractor.com\r\n`;
        ics += `DTSTAMP:${dtstamp}\r\n`;
        ics += `DTSTART:${dtstart}\r\n`;
        ics += `DTEND:${dtend}\r\n`;
        ics += `SUMMARY:${escapeIcsText(event.summary)}\r\n`;
        
        if (event.location) {
            ics += `LOCATION:${escapeIcsText(event.location)}\r\n`;
        }
        
        if (event.description) {
            ics += `DESCRIPTION:${escapeIcsText(event.description)}\r\n`;
        }
        
        ics += 'END:VEVENT\r\n';
    });
    
    ics += 'END:VCALENDAR\r\n';
    return ics;
}

function formatIcsDateTime(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeIcsText(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

function downloadIcs(icsContent) {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `events-${Date.now()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
