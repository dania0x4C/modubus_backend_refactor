FROM node:20-alpine
WORKDIR /usr/src/app

# 의존성 파일 복사 및 설치
COPY package.json package-lock.json* ./
RUN npm install

# curl 설치 (헬스체크용)
RUN apk --no-cache add curl

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 3000

# 애플리케이션 실행
CMD ["npm", "run", "start:debug"]