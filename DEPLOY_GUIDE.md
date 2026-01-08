# คู่มือการ Deploy ผ่าน GitHub ไปยัง Server (Server Deployment Guide)

คู่มือนี้จะอธิบายขั้นตอนการนำ Code ขึ้น GitHub และดึงลงไปรันบน Server Production โดยใช้ Docker Compose

## 1. เตรียม Code บนเครื่อง Local (Mac/Windows)

เราได้ทำการเตรียมไฟล์ที่จำเป็นไว้แล้ว:
- `.gitignore`: ป้องกันไฟล์รหัสผ่านและ Environment หลุดขึ้น GitHub (เพิ่ม `docker.env` และ `.env` แล้ว)
- `docker.env.example`: ไฟล์ต้นแบบสำหรับการตั้งค่า Environment บน Server
- `docker-compose.prod.yml`: ไฟล์สำหรับรัน Docker บน Server

### สิ่งที่ต้องทำบนเครื่อง Local:
1.  **Commit Code ทั้งหมด**:
    ```bash
    git add .
    git commit -m "Prepare for deployment"
    ```
2.  **Push ขึ้น GitHub Repository**:
    ```bash
    git remote add origin https://github.com/<username>/<repo-name>.git
    git push -u origin main
    ```
    *(ถ้ามี Remote อยู่แล้วให้ข้ามบรรทัดแรก)*

---

## 2. ขั้นตอนบนเครื่อง Server (Production)

### สิ่งที่ต้องมีบน Server:
- ติดตั้ง **Git**: `sudo apt install git`
- ติดตั้ง **Docker** และ **Docker Compose**

### ขั้นตอนการ Deploy:

1.  **Clone Repository**:
    ```bash
    git clone https://github.com/<username>/<repo-name>.git
    cd <repo-name>
    ```

2.  **สร้างไฟล์ Environment**:
    เนื่องจากเราไม่ได้เอาไฟล์รหัสผ่านขึ้น GitHub เราต้องสร้างใหม่บน Server จากไฟล์ตัวอย่าง
    ```bash
    cp docker.env.example docker.env
    ```

3.  **แก้ไขค่า Config ใน `docker.env`**:
    ใช้ Editor เช่น `nano` หรือ `vim` เข้าไปแก้ไฟล์
    ```bash
    nano docker.env
    ```
    **ค่าที่ต้องระวังเป็นพิเศษ:**
    *   `NEXTAUTH_SECRET`: ตั้งรหัสสุ่มยาวๆ อะไรก็ได้ (ห้ามใช้ `changeme_in_production`)
    *   `NEXTAUTH_URL`: เปลี่ยนเป็น Domain ของ Server เช่น `http://myschool.com` หรือ IP Address `http://1.2.3.4:3000`
    *   `DB_HOST`:
        *   ถ้าใช้ XAMPP บนเครื่อง Server เดียวกัน: ลองใช้ `host.docker.internal` (Docker รุ่นใหม่บน Linux รองรับแล้วผ่าน config `extra_hosts` ที่เตรียมไว้ให้)
        *   ถ้าไม่ได้ผล: ให้ใช้ IP Address ของเครื่อง Server (เช็คด้วย `ifconfig` หรือ `ip addr`) เช่น `192.168.1.50`
    *   `DB_PASSWORD`: ใส่รหัสผ่านของ Database จริงๆ

4.  **สั่ง Run ด้วย Docker Compose**:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d --build
    ```

5.  **ตรวจสอบสถานะ**:
    ```bash
    docker-compose -f docker-compose.prod.yml ps
    ```
    ถ้าขึ้น State `Up` แสดงว่าทำงานเรียบร้อย

---

## 3. การอัปเดตเวอร์ชันใหม่ (Update)

เมื่อมีการแก้ไข Code บนเครื่อง Local และ Push ขึ้น GitHub แล้ว:
1.  กลับไปที่เครื่อง Server
2.  ดึง Code ใหม่:
    ```bash
    git pull origin main
    ```
3.  Build และ Run ใหม่:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d --build
    ```
