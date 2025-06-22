#!/bin/bash
set -e  # 에러 발생 시 스크립트 즉시 종료

# Docker Compose 명령어를 결정하는 함수
get_docker_compose_command() {
    # 5432 포트(PostgreSQL)가 사용 중인지 확인하는 명령어
    check_port="lsof -i :5432"

    # 포트 상태에 따른 Docker Compose 명령어 실행
    if eval "$check_port" >/dev/null 2>&1; then
        # 5432 포트가 이미 사용 중이면 백엔드 서비스만 실행
        docker compose -f "$DOCKER_COMPOSE_FILE" up $SERVICE_NAME -d
    else
        # 5432 포트가 비어있으면 모든 서비스 실행 (DB 포함)
        docker compose -f "$DOCKER_COMPOSE_FILE" up -d
    fi
}

# 데이터베이스 존재 여부 확인 및 생성 함수
check_and_create_database() {
    # 애플리케이스 준비 상태 확인 메시지
    echo "Application '$SERVICE_NAME' is ready. Now checking PostgreSQL status on port 5432..."
    
    # PostgreSQL 준비 상태 확인 (헬스 체크)
    timeout=180      # 최대 대기 시간 (3분)
    interval=5       # 체크 간격 (5초)
    elapsed=0        # 경과 시간 초기화
    
    # PostgreSQL이 준비될 때까지 반복 체크
    until docker compose -f "$DOCKER_COMPOSE_FILE" exec postgres pg_isready -U postgres -h localhost -p 5432; do
        # 타임아웃 시간 초과 시 스크립트 종료
        if [ $elapsed -ge $timeout ]; then
            echo "PostgreSQL is not ready after $timeout seconds. Exiting."
            return 1
        fi
        echo "PostgreSQL is not ready. Waiting $interval seconds..."
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    echo "PostgreSQL is ready. Checking if database '$SERVICE_DB_NAME' exists..."

    # 데이터베이스 존재 여부 확인 및 생성
    # PostgreSQL에서 해당 데이터베이스가 존재하는지 SQL 쿼리로 확인
    if docker compose -f "$DOCKER_COMPOSE_FILE" exec postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$SERVICE_DB_NAME';" | grep -q 1; then
        # 데이터베이스가 이미 존재하면 건너뛰기
        echo "Database '$SERVICE_DB_NAME' already exists. Skipping creation."
    else
        # 데이터베이스가 없으면 새로 생성
        echo "Database '$SERVICE_DB_NAME' does not exist. Creating database..."
        docker compose -f "$DOCKER_COMPOSE_FILE" exec postgres psql -U postgres -c "CREATE DATABASE \"$SERVICE_DB_NAME\";"
        echo "Database '$SERVICE_DB_NAME' created successfully."
    fi
    
    echo "Database '$SERVICE_DB_NAME' is ready. Now syncing the database schema..."
    sleep 5
    
    # 직접 해당 부분 수정해서 템플릿 기본 구성 맞추기
    # docker compose -f "$DOCKER_COMPOSE_FILE" exec $SERVICE_NAME npm run db:sync 
    echo "Database schema synced successfully."
    sleep 5
    
    # 백엔드 서비스 재시작 (설정 반영을 위해)
    echo "Restarting the '$SERVICE_NAME' container..."
    docker compose -f "$DOCKER_COMPOSE_FILE" restart $SERVICE_NAME
}

# 사용자에게 실행할 작업 선택 안내
echo "Please choose an action:"
echo "  start the Docker Compose >>> [start or s]"
echo "  stop the Docker Compose >>> [stop or t]"
read -p "Do you want to start or stop the Docker Compose? (start/stop) [default: start]: " choice

# 서비스 및 데이터베이스 이름 설정
SERVICE_NAME="modubus-backend"
SERVICE_DB_NAME="modubus-backend-dev"

# 기본값 설정 및 소문자 변환
choice=${choice:-start}  # 입력이 없으면 기본값 'start'
choice=$(echo "$choice" | tr '[:upper:]' '[:lower:]')  # 대문자를 소문자로 변환

# Docker Compose 파일 경로 설정
DOCKER_COMPOSE_FILE="$PWD/docker-compose.yml"

# 사용자 선택에 따른 작업 실행
if [[ "$choice" == "start" || "$choice" == "s" ]]; then
    echo "Starting Docker Compose..."
    
    # 운영체제별 dependency 설치 처리
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS에서 실행
        docker run -it --rm -v "$PWD":/app -w /app node:20.18.0 bash -c "npm install"
    elif grep -qEi "(Microsoft|WSL)" /proc/version &>/dev/null; then
        # WSL2 Ubuntu에서 실행 (권한 문제 해결을 위해 user ID 지정)
        USER_ID=$(id -u)
        GROUP_ID=$(id -g)
        docker run -it --rm -v "$PWD":/app -w /app --user "$USER_ID:$GROUP_ID" node:20.18.0 bash -c "npm install"
    else
        # Windows에서 직접 실행하는 경우 경고 및 종료
        echo -e "\e[31mWindows에서 스크립트를 실행 중입니다. WSL2 Ubuntu 22.04를 사용해 주세요.\e[0m"
        exit 1
    fi

    # Docker Compose 서비스 시작
    get_docker_compose_command
    # 데이터베이스 체크 및 초기화
    check_and_create_database
    # 백엔드 서비스 로그 실시간 출력
    docker compose -f "$DOCKER_COMPOSE_FILE" logs -f $SERVICE_NAME 
    
elif [[ "$choice" == "stop" || "$choice" == "t" ]]; then
    # Docker Compose 서비스 중지
    echo "Stopping Docker Compose..."
    docker compose -f "$DOCKER_COMPOSE_FILE" down
else
    # 잘못된 입력 시 종료
    echo "Invalid choice. Exiting."
    exit 1
fi