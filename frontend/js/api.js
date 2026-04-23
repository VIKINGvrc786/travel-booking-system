const API_URL = 'https://travel-backend-oh36.onrender.com/api';

// 1. Handle Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('userId', data.userId);
            window.location.href = 'booking.html';
        } else {
            alert("Login Failed: " + data.error);
        }
    });
}

// 2. Handle Booking
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            userId: localStorage.getItem('userId'),
            passengerName: document.getElementById('passengerName').value,
            source: document.getElementById('source').value,
            destination: document.getElementById('destination').value,
            transportType: document.getElementById('transportType').value,
            hotelType: document.getElementById('hotelType').value,
            date: document.getElementById('date').value
        };

        const res = await fetch(`${API_URL}/bookings/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById('result').style.display = 'block';
            document.getElementById('downloadLink').href = data.ticketUrl;
        } else {
            alert('Booking failed. Please check the server logs.');
        }
    });
}