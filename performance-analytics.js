// Performance Analytics - Save and retrieve exam results via MongoDB
import { auth } from './firebase-init.js';

export async function saveExamResult(examData) {
  try {
    const user = auth.currentUser;
    if (!user) { console.log('No user logged in, exam result not saved'); return null; }

    const idToken = await user.getIdToken();
    const res = await fetch('/api/exam-results/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        totalScore: examData.totalScore,
        percentage: examData.percentage,
        correctAnswers: examData.correctAnswers,
        wrongAnswers: examData.wrongAnswers,
        subjectScores: examData.subjectScores,
        timeSpent: examData.timeSpent || 0,
        completedAt: new Date().toISOString()
      })
    });
    const data = await res.json();
    if (data.success) {
      console.log('Exam result saved:', data.id);
      return data.id;
    }
    return null;
  } catch (error) {
    console.error('Error saving exam result:', error);
    return null;
  }
}

export async function getExamResults() {
  try {
    const user = auth.currentUser;
    if (!user) return [];

    const idToken = await user.getIdToken();
    const res = await fetch('/api/exam-results/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data = await res.json();
    return data.success ? data.results : [];
  } catch (error) {
    console.error('Error fetching exam results:', error);
    return [];
  }
}

export async function getAnalyticsSummary() {
  try {
    const results = await getExamResults();
    if (results.length === 0) {
      return { totalSessions: 0, avgAccuracy: 0, totalQuestions: 0, totalCorrect: 0, subjectStats: {} };
    }

    let totalCorrect = 0;
    let totalQuestions = 0;
    const subjectStats = {};

    results.forEach(result => {
      totalCorrect += result.correctAnswers || 0;
      totalQuestions += (result.correctAnswers || 0) + (result.wrongAnswers || 0);
      if (result.subjectScores) {
        Object.entries(result.subjectScores).forEach(([subject, scores]) => {
          if (!subjectStats[subject]) subjectStats[subject] = { correct: 0, total: 0 };
          subjectStats[subject].correct += scores.correct || 0;
          subjectStats[subject].total += scores.total || 0;
        });
      }
    });

    return {
      totalSessions: results.length,
      avgAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      totalQuestions,
      totalCorrect,
      subjectStats,
      results
    };
  } catch (error) {
    console.error('Error calculating analytics summary:', error);
    return null;
  }
}
