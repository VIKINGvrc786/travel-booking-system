const API_URL = 'https://travel-backend-oh36.onrender.com/api';

// Handle Login
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
            document.getElementById('loginMessage').innerText = data.error;
        }
    });
}

// Handle Booking
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const passengerName = document.getElementById('passengerName').value;
        const source = document.getElementById('source').value;
        const destination = document.getElementById('destination').value;
        const date = document.getElementById('date').value;
        const userId = localStorage.getItem('userId');

        if (!userId) {
            alert("Please login first!");
            window.location.href = 'login.html';
            return;
        }

        const res = await fetch(`${API_URL}/bookings/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, passengerName, source, destination, date })
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById('result').style.display = 'block';
            document.getElementById('downloadLink').href = data.ticketUrl;
        } else {
            alert('Booking failed.');
        }
    });
}