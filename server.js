// server.js
require('dotenv').config(); // .env 파일에서 환경 변수 로드

const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs'); // 파일 시스템 모듈 추가

const app = express();
const port = process.env.PORT || 3000; // 서버가 실행될 포트 번호 (환경 변수 우선)

// Gemini API 키 설정
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Multer 설정: 이미지 업로드를 처리합니다.
const upload = multer({ dest: 'uploads/' }); // 'uploads' 폴더에 임시로 파일 저장

// 정적 파일 제공 (프론트엔드 파일들)
app.use(express.static(path.join(__dirname))); // voca 폴더 자체를 정적 파일 경로로 설정

// CORS 설정 (선택 사항이지만 개발 시 유용)
// 실제 배포 시에는 특정 도메인만 허용하도록 설정하는 것이 좋습니다.
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // 모든 도메인 허용
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 이미지 업로드 및 텍스트 추출 API 엔드포인트
app.post('/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('이미지 파일이 업로드되지 않았습니다.');
    }

    const imagePath = req.file.path; // 업로드된 임시 파일 경로

    try {
        // 이미지 파일을 base64로 인코딩
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        // Gemini Vision 모델 초기화
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Gemini API 요청 구성
        const result = await model.generateContent([
            "이 이미지에서 영어 단어와 그에 해당하는 한글 해석을 추출하여 JSON 배열 형태로 제공해 주세요. 각 항목은 'eng'와 'kor' 키를 가져야 합니다. 예를 들어, [{ \"eng\": \"apple\", \"kor\": \"사과\" }, { \"eng\": \"book\", \"kor\": \"책\" }] 와 같이 응답해 주세요. 단어와 해석이 나란히 표기된 리스트라고 가정합니다.",
            {
                inlineData: {
                    mimeType: req.file.mimetype,
                    data: base64Image
                }
            }
        ]);

        // 안전 설정 (선택 사항)
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json\n|```/g, '').trim();

        // Gemini 응답 파싱 (JSON 형식으로 가정)
        let parsedData;
        try {
            parsedData = JSON.parse(cleanedText);
            // 배열인지 확인
            if (!Array.isArray(parsedData)) {
                throw new Error("Gemini 응답이 유효한 JSON 배열이 아닙니다.");
            }
        } catch (parseError) {
            console.error("Gemini 응답 파싱 오류:", parseError);
            console.error("Gemini 원본 응답:", text);
            // 파싱 실패 시, 원본 텍스트를 그대로 반환하거나 오류 메시지 반환
            return res.status(500).json({ error: "Gemini 응답을 파싱할 수 없습니다.", rawResponse: text });
        }

        res.json(parsedData); // 추출된 단어 목록을 클라이언트에 전송

    } catch (error) {
        console.error('Gemini API 호출 중 오류 발생:', error);
        res.status(500).send('이미지 처리 중 오류가 발생했습니다.');
    } finally {
        // 임시 파일 삭제
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
});

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
    console.log(`웹 앱은 http://localhost:${port}/index.html 에서 접근 가능합니다.`);
});