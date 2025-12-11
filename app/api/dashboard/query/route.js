import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper to clean Gemini output
function cleanJson(text) {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

// ========== JS FALLBACK SYSTEM (ทำงานได้โดยไม่ต้องใช้ AI) ==========
async function jsFallbackQuery(question) {
    const q = question.toLowerCase();

    // === Greeting ===
    if (q.includes('สวัสดี') || q.includes('หวัดดี') || q.includes('hello') || q.includes('hi')) {
        return 'สวัสดีครับ! 🙏 ผมคือผู้ช่วยอัจฉริยะ พร้อมช่วยเหลือเรื่องข้อมูลวิทยาลัยครับ\n\nถามได้เลย เช่น:\n• มีนักศึกษากี่คน?\n• มีอาจารย์กี่คน?\n• มีวิชากี่วิชา?\n• ค้นหานักศึกษาชื่อ...';
    }
    if (q.includes('ชื่ออะไร') || q.includes('คุณคือใคร')) {
        return 'ผมคือ ผู้ช่วยอัจฉริยะ 🤖 ช่วยค้นหาข้อมูลนักศึกษา อาจารย์ วิชา และตารางสอนได้ครับ';
    }
    if (q.includes('ช่วยอะไร') || q.includes('ทำอะไรได้')) {
        return 'ผมช่วยได้หลายอย่างครับ:\n• นับจำนวนนักศึกษา อาจารย์ วิชา\n• ค้นหาข้อมูลตามชื่อ\n• ดูข้อมูลห้องเรียน แผนก\n\nลองถามได้เลยครับ! 😊';
    }
    if (q.includes('ขอบคุณ') || q.includes('thanks')) {
        return 'ยินดีครับ! 😊 มีอะไรให้ช่วยอีกไหมครับ?';
    }

    // === COUNT Questions ===
    try {
        // นักศึกษา
        if (q.includes('นักศึกษา') && (q.includes('กี่') || q.includes('จำนวน') || q.includes('ทั้งหมด'))) {
            const [rows] = await db.execute('SELECT COUNT(*) as count FROM students');
            return `📚 มีนักศึกษาทั้งหมด ${rows[0].count} คนครับ`;
        }
        // อาจารย์
        if (q.includes('อาจารย์') && (q.includes('กี่') || q.includes('จำนวน') || q.includes('ทั้งหมด'))) {
            const [rows] = await db.execute('SELECT COUNT(*) as count FROM teachers');
            return `👨‍🏫 มีอาจารย์ทั้งหมด ${rows[0].count} คนครับ`;
        }
        // วิชา
        if (q.includes('วิชา') && (q.includes('กี่') || q.includes('จำนวน') || q.includes('ทั้งหมด'))) {
            const [rows] = await db.execute('SELECT COUNT(*) as count FROM subjects');
            return `📖 มีวิชาทั้งหมด ${rows[0].count} วิชาครับ`;
        }
        // ห้อง
        if (q.includes('ห้อง') && (q.includes('กี่') || q.includes('จำนวน') || q.includes('ทั้งหมด'))) {
            const [rows] = await db.execute('SELECT COUNT(*) as count FROM rooms');
            return `🏫 มีห้องเรียนทั้งหมด ${rows[0].count} ห้องครับ`;
        }
        // แผนก
        if (q.includes('แผนก') && (q.includes('กี่') || q.includes('จำนวน') || q.includes('ทั้งหมด'))) {
            const [rows] = await db.execute('SELECT COUNT(*) as count FROM departments');
            return `🏢 มีแผนกทั้งหมด ${rows[0].count} แผนกครับ`;
        }
        // ตารางสอน
        if (q.includes('ตาราง') && (q.includes('กี่') || q.includes('จำนวน'))) {
            const [rows] = await db.execute('SELECT COUNT(*) as count FROM schedule');
            return `📅 มีรายการตารางสอนทั้งหมด ${rows[0].count} รายการครับ`;
        }

        // === SEARCH Questions ===
        // ค้นหานักศึกษา
        if (q.includes('นักศึกษา') && (q.includes('ค้นหา') || q.includes('หา') || q.includes('ชื่อ'))) {
            const nameMatch = question.match(/(?:ชื่อ|หา|ค้นหา)\s*(.+)/i);
            if (nameMatch) {
                const searchName = nameMatch[1].trim();
                const [rows] = await db.execute('SELECT name, studentId, department FROM students WHERE name LIKE ? LIMIT 10', [`%${searchName}%`]);
                if (rows.length > 0) {
                    const list = rows.map(r => `• ${r.name} (${r.studentId}) - ${r.department || 'ไม่ระบุแผนก'}`).join('\n');
                    return `🔍 พบนักศึกษา ${rows.length} คน:\n${list}`;
                }
                return `ไม่พบนักศึกษาชื่อ "${searchName}" ครับ`;
            }
        }

        // ค้นหาอาจารย์
        if (q.includes('อาจารย์') && (q.includes('ค้นหา') || q.includes('หา') || q.includes('ชื่อ'))) {
            const nameMatch = question.match(/(?:ชื่อ|หา|ค้นหา|อาจารย์)\s*(.+)/i);
            if (nameMatch) {
                const searchName = nameMatch[1].replace(/อาจารย์/g, '').trim();
                if (searchName) {
                    const [rows] = await db.execute('SELECT name, department FROM teachers WHERE name LIKE ? LIMIT 10', [`%${searchName}%`]);
                    if (rows.length > 0) {
                        const list = rows.map(r => `• ${r.name} - ${r.department || 'ไม่ระบุแผนก'}`).join('\n');
                        return `🔍 พบอาจารย์ ${rows.length} คน:\n${list}`;
                    }
                    return `ไม่พบอาจารย์ชื่อ "${searchName}" ครับ`;
                }
            }
        }

        // รายชื่อแผนก
        if (q.includes('แผนก') && (q.includes('อะไรบ้าง') || q.includes('มีอะไร') || q.includes('รายชื่อ') || q.includes('ทั้งหมด'))) {
            const [rows] = await db.execute('SELECT name FROM departments LIMIT 20');
            if (rows.length > 0) {
                const list = rows.map((r, i) => `${i + 1}. ${r.name}`).join('\n');
                return `🏢 รายชื่อแผนก:\n${list}`;
            }
            return 'ยังไม่มีข้อมูลแผนกในระบบครับ';
        }

        // รายชื่อห้อง
        if (q.includes('ห้อง') && (q.includes('อะไรบ้าง') || q.includes('มีอะไร') || q.includes('รายชื่อ'))) {
            const [rows] = await db.execute('SELECT name, type FROM rooms LIMIT 20');
            if (rows.length > 0) {
                const list = rows.map((r, i) => `${i + 1}. ${r.name} (${r.type || 'ทั่วไป'})`).join('\n');
                return `🏫 รายชื่อห้องเรียน:\n${list}`;
            }
            return 'ยังไม่มีข้อมูลห้องเรียนในระบบครับ';
        }

    } catch (dbError) {
        console.error('JS Fallback DB Error:', dbError.message);
    }

    // ไม่ตรงกับ pattern ใดๆ
    return null;
}

export async function POST(request) {
    try {
        const { question } = await request.json();
        if (!question) return NextResponse.json({ answer: 'กรุณาพิมพ์คำถามครับ' });

        // ===== 1. Try JS Fallback First (always works) =====
        const jsFallback = await jsFallbackQuery(question);
        if (jsFallback) {
            return NextResponse.json({ answer: jsFallback });
        }

        // ===== 2. Try AI if available =====
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({
                answer: 'ผมยังไม่เข้าใจคำถามนี้ครับ 🤔\n\nลองถามแบบนี้ดูนะครับ:\n• มีนักศึกษากี่คน?\n• มีอาจารย์กี่คน?\n• มีวิชากี่วิชา?\n• ค้นหานักศึกษาชื่อ...'
            });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Try multiple models (different API keys support different models)
        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        let model = null;
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                model = genAI.getGenerativeModel({ model: modelName });
                // Quick test to see if model works
                const testResult = await model.generateContent('ตอบสั้นๆ: 1+1=?');
                if (testResult.response.text()) {
                    console.log(`Using model: ${modelName}`);
                    break;
                }
            } catch (e) {
                lastError = e;
                console.log(`Model ${modelName} not available, trying next...`);
                model = null;
            }
        }

        if (!model) {
            console.error('No Gemini model available:', lastError?.message);
            return NextResponse.json({
                answer: 'ขออภัยครับ ไม่สามารถเชื่อมต่อ AI ได้ กรุณาตรวจสอบ GEMINI_API_KEY หรือลองใหม่ภายหลัง'
            });
        }

        // 1. Schema Definition for AI
        const schemaContext = `
            คุณคือ AI Assistant ที่ช่วยตอบคำถามเกี่ยวกับระบบบริหารวิทยาลัย
            คุณสามารถช่วยค้นหาข้อมูลจาก database และตอบคำถามทั่วไปได้
            
            ตารางในระบบ:
            - teachers (id, name, department) - อาจารย์
            - subjects (id, code, name, credit, theoryHours, practiceHours, teacher_id) - วิชา
            - rooms (id, name, type) - ห้องเรียน
            - class_levels (id, name) - ระดับชั้น
            - schedule (id, term, day_of_week, start_period, end_period, subject_id, teacher_id, room_id, class_level) - ตารางสอน
            - students (id, code, name, class_level, department) - นักศึกษา
            - departments (id, name) - แผนก
            
            กฎ:
            1. ตอบกลับเป็น JSON: { "sql": "...", "message": "..." }
            2. ถ้าต้องการข้อมูลจาก database ให้ใส่ "sql" เป็น SELECT statement
            3. ถ้าเป็นคำถามทั่วไป ให้ใส่ "message" พร้อมคำตอบ และใส่ "sql": null
            4. ใช้ LIKE %keyword% สำหรับการค้นหา
            5. day_of_week มีค่าเป็น: 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัส', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์'
            6. LIMIT 20 เสมอ
            7. ใช้ JOIN เพื่อดึงชื่อแทน ID
        `;

        // 2. Generate SQL or Message
        const sqlPrompt = `${schemaContext}\n\nคำถาม: "${question}"\nJSON:`;

        let queryData;
        try {
            const sqlResult = await model.generateContent(sqlPrompt);
            const sqlResponse = cleanJson(sqlResult.response.text());
            queryData = JSON.parse(sqlResponse);
        } catch (parseError) {
            console.error('AI Parse Error:', parseError.message);
            // If AI response can't be parsed, try direct answer
            try {
                const directResult = await model.generateContent(`ตอบคำถามนี้เป็นภาษาไทยสั้นๆ: "${question}"`);
                return NextResponse.json({ answer: directResult.response.text() });
            } catch (e) {
                console.error('Direct answer failed:', e.message);
                return NextResponse.json({ answer: 'ขออภัยครับ ระบบ AI ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง' });
            }
        }

        // Handle Message-only response
        if (queryData.message && !queryData.sql) {
            return NextResponse.json({ answer: queryData.message });
        }

        if (!queryData.sql) {
            return NextResponse.json({ answer: queryData.message || 'ผมเข้าใจคำถามครับ แต่ไม่แน่ใจว่าต้องการข้อมูลอะไร ลองถามให้ชัดเจนขึ้นนะครับ' });
        }

        // 3. Execute SQL (Safe Check)
        if (!queryData.sql.toLowerCase().trim().startsWith('select')) {
            return NextResponse.json({ answer: 'ระบบอนุญาตเฉพาะการค้นหาข้อมูลเท่านั้นครับ' });
        }

        let dbResults = [];
        try {
            const [rows] = await db.execute(queryData.sql);
            dbResults = rows;
        } catch (dbError) {
            console.error("SQL Error:", dbError.message, "SQL:", queryData.sql);
            return NextResponse.json({
                answer: 'ขออภัยครับ ผมพยายามค้นหาแล้วแต่เกิดข้อผิดพลาด ลองถามใหม่โดยระบุให้ชัดเจนขึ้นนะครับ เช่น "มีนักศึกษากี่คน" หรือ "อาจารย์สมชายสอนวิชาอะไร"'
            });
        }

        // 4. Summarize Results
        if (dbResults.length === 0) {
            return NextResponse.json({ answer: 'ไม่พบข้อมูลที่ตรงกับคำถามของคุณครับ ลองถามด้วยคำอื่นดูนะครับ' });
        }

        const summaryPrompt = `
            ข้อมูลที่พบ: ${JSON.stringify(dbResults)}
            คำถามเดิม: "${question}"
            
            สรุปข้อมูลนี้ตอบคำถามเป็นภาษาไทยให้กระชับ:
            - ถ้าเป็นรายการให้แสดงเป็นข้อๆ
            - ถ้าเป็นจำนวนให้บอกชัดเจน
            - ใส่ emoji ให้ดูน่าอ่าน
        `;

        const summaryResult = await model.generateContent(summaryPrompt);
        const finalAnswer = summaryResult.response.text();

        return NextResponse.json({ answer: finalAnswer });

    } catch (error) {
        console.error("Smart Query Error:", error.message);

        // Return user-friendly error
        if (error.message?.includes('quota') || error.message?.includes('429')) {
            return NextResponse.json({ answer: 'ขออภัยครับ ระบบ AI มีการใช้งานมากเกินไป กรุณารอสักครู่แล้วลองใหม่ครับ' });
        }

        return NextResponse.json({ answer: 'ขออภัยครับ เกิดข้อผิดพลาด ลองถามใหม่อีกครั้งนะครับ 🙏' });
    }
}

