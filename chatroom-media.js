// Chatroom Media Handling - Images and Voice Notes
// Stores media via MongoDB backend API
import { auth } from './firebase-init.js';

class ChatroomMedia {
  constructor() {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > 800 || height > 600) {
          const ratio = Math.min(800 / width, 600 / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  }

  async handleImageUpload(file) {
    if (!this.currentUser) { alert('Please sign in to send images'); return; }
    if (!file.type.startsWith('image/')) { alert('Please select a valid image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return; }

    try {
      this.compressImage(file, async (compressedBase64) => {
        try {
          const sizeInMB = (compressedBase64.length * 3) / (4 * 1024 * 1024);
          if (sizeInMB > 0.9) {
            alert(`Image too large (${sizeInMB.toFixed(2)}MB). Please use a smaller image.`);
            return;
          }
          const idToken = await this.currentUser.getIdToken();
          const res = await fetch('/api/chat-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              type: 'image',
              imageData: compressedBase64,
              imageName: file.name,
              displayName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
              userEmail: this.currentUser.email
            })
          });
          const data = await res.json();
          if (data.success) {
            console.log('✅ Image sent successfully:', data.messageId);
          } else {
            alert('Failed to send image: ' + data.error);
          }
        } catch (error) {
          console.error('❌ Error saving image:', error);
          alert('Failed to send image: ' + error.message);
        }
      });
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecording = true;
      this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
      this.mediaRecorder.onstop = async () => { await this.sendVoiceNote(); };
      this.mediaRecorder.start();
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
      return false;
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
  }

  async sendVoiceNote() {
    if (!this.currentUser) { alert('Please sign in to send voice notes'); return; }
    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Audio = event.target.result;
          const sizeInMB = (base64Audio.length * 3) / (4 * 1024 * 1024);
          if (sizeInMB > 0.9) {
            alert(`Voice note too large (${sizeInMB.toFixed(2)}MB). Please record a shorter clip.`);
            return;
          }
          const idToken = await this.currentUser.getIdToken();
          const res = await fetch('/api/chat-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              type: 'voice',
              voiceData: base64Audio,
              displayName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
              userEmail: this.currentUser.email
            })
          });
          const data = await res.json();
          if (data.success) {
            console.log('✅ Voice note sent:', data.messageId);
            this.audioChunks = [];
          } else {
            alert('Failed to send voice note: ' + data.error);
          }
        } catch (error) {
          console.error('❌ Error saving voice note:', error);
          alert('Failed to send voice note: ' + error.message);
        }
      };
      reader.onerror = () => alert('Failed to read voice note file.');
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing voice note:', error);
      alert('Failed to process voice note. Please try again.');
    }
  }

  getRecordingStatus() { return this.isRecording; }
}

export const chatroomMedia = new ChatroomMedia();
