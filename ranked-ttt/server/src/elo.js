export function expectedScore(ratingA, ratingB) {
return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}


export function updateElo(rA, rB, scoreA, k = 32) {
const expA = expectedScore(rA, rB);
const expB = expectedScore(rB, rA);
const newRA = Math.round(rA + k * (scoreA - expA));
const newRB = Math.round(rB + k * ((1 - scoreA) - expB));
return [newRA, newRB, Math.round(newRA - rA)];
}