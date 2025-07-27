// script.js
// 1. HTML 요소 가져오기
const wordDisplay = document.getElementById('word-display');
const engWordText = document.getElementById('eng-word-text'); // 새로 추가된 span
const speakBtn = document.getElementById('speak-btn'); // 새로 추가된 버튼
const translationDisplay = document.getElementById('translation-display');
const engBtn = document.getElementById('eng-btn');
const korBtn = document.getElementById('kor-btn');

// 새롭게 추가될 요소들 (기존과 동일)
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*'; // 이미지 파일만 허용
const uploadBtn = document.createElement('button');
uploadBtn.textContent = '단어 목록 이미지 업로드';
uploadBtn.style.marginTop = '20px'; // 버튼 간격 조절

// 버튼 그룹에 업로드 버튼 추가 (기존과 동일)
const buttonGroup = document.querySelector('.button-group');
buttonGroup.appendChild(uploadBtn);

let currentWordList = []; // 서버에서 받아온 단어 목록을 저장할 변수

// 2. 랜덤 단어 선택 함수 (기존과 동일)
function getRandomWord() {
    if (currentWordList.length === 0) {
        engWordText.textContent = '단어 목록을 먼저 업로드해주세요!';
        translationDisplay.textContent = '';
        speakBtn.style.display = 'none'; // 단어 없을 땐 버튼 숨김
        return null;
    }
    const randomIndex = Math.floor(Math.random() * currentWordList.length);
    return currentWordList[randomIndex];
}

// 3. "랜덤 영어 단어" 버튼 클릭 이벤트
engBtn.addEventListener('click', () => {
    const word = getRandomWord();
    if (word) {
        engWordText.textContent = word.eng; // span에 영어 단어 표시
        speakBtn.style.display = 'inline-block'; // 음성 버튼 보이게 함
        translationDisplay.textContent = ''; // 이전 번역 숨기기
        setTimeout(() => {
            translationDisplay.textContent = word.kor;
        }, 5000); // 5초 후에 번역 표시
    }
});

// 4. "랜덤 한글 뜻" 버튼 클릭 이벤트
korBtn.addEventListener('click', () => {
    const word = getRandomWord();
    if (word) {
        translationDisplay.textContent = word.kor;
        engWordText.textContent = ''; // 이전 단어 숨기기
        speakBtn.style.display = 'none'; // 음성 버튼 숨김
        setTimeout(() => {
            engWordText.textContent = word.eng; // span에 영어 단어 표시
            speakBtn.style.display = 'inline-block'; // 음성 버튼 보이게 함
        }, 5000); // 5초 후에 영어 단어 표시
    }
});

// 5. "단어 목록 이미지 업로드" 버튼 클릭 이벤트 (기존과 동일)
uploadBtn.addEventListener('click', () => {
    fileInput.click(); // 숨겨진 파일 입력 필드 클릭
});

// 6. 파일 선택 시 이벤트 처리 (기존과 동일)
fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    engWordText.textContent = '이미지 분석 중...';
    translationDisplay.textContent = '';
    speakBtn.style.display = 'none'; // 분석 중에는 버튼 숨김

    const formData = new FormData();
    formData.append('image', file); // 'image'는 server.js에서 multer가 기대하는 필드 이름입니다.

    try {
        const response = await fetch('https://engvoca.onrender.com/upload-image', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        currentWordList = data; // 서버에서 받은 단어 목록으로 업데이트

        if (currentWordList.length > 0) {
            engWordText.textContent = '단어 목록 로드 완료!';
            translationDisplay.textContent = '이제 학습을 시작하세요.';
        } else {
            engWordText.textContent = '이미지에서 단어를 찾을 수 없습니다.';
            translationDisplay.textContent = '다른 이미지를 시도해 보세요.';
        }

        console.log('서버로부터 받은 단어 목록:', currentWordList);

    } catch (error) {
        console.error('이미지 업로드 및 처리 중 오류 발생:', error);
        engWordText.textContent = '오류 발생!';
        translationDisplay.textContent = '이미지 처리 중 문제가 발생했습니다.';
    }
});

// 7. 음성 재생 기능 추가
speakBtn.addEventListener('click', () => {
    const textToSpeak = engWordText.textContent;
    if (textToSpeak && textToSpeak !== '단어 목록 로드 완료!' && textToSpeak !== '이미지 분석 중...' && textToSpeak !== '오류 발생!') {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'en-US'; // 영어로 설정
        speechSynthesis.speak(utterance);
    }
});