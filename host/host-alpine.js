// Initialize Firebase
// firebaseConfig is loaded from shared/firebase-config.js
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

import { createHostData } from './host-data.js';

document.addEventListener('alpine:init', () => {
    Alpine.data('triviaHost', () => createHostData(firebase, db));
});