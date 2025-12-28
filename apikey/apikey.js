function updateThresholdValue(option) {
    const slider = document.getElementById(`${option}-threshold`);
    const display = document.getElementById(`${option}-threshold-value`);
    if (slider && display) {
        display.textContent = parseFloat(slider.value).toFixed(2);
    }
}

function updatePrice() {
    const plan = document.querySelector('input[name="plan"]:checked')?.value;
    const priceText = document.getElementById('price-text');
    if (!priceText) {
        return;
    }
    const messages = {
        image: 'ราคา 79 บาท/เดือน (Image)',
        video: 'ราคา 119 บาท/เดือน (Video)',
        both: 'ราคา 159 บาท/เดือน (Image + Video)',
    };
    priceText.textContent = messages[plan] || 'กรุณาเลือกแพ็กเกจ';
}

async function generateApiKey() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("กรุณาล็อกอินก่อน");
        return;
    }

    let analysisTypes = [];
    document.querySelectorAll('.analysis-option:checked').forEach(option => {
        analysisTypes.push(option.value);
    });

    const planInput = document.querySelector('input[name="plan"]:checked');
    if (!planInput) {
        alert("กรุณาเลือกแพ็กเกจการใช้งาน");
        return;
    }
    const packageType = planInput.value;

    const durationInput = document.getElementById("quota");
    const durationMonths = parseInt(durationInput.value, 10);
    if (analysisTypes.length === 0 || Number.isNaN(durationMonths) || durationMonths < 1) {
        alert("กรุณาเลือกโมเดลและระบุจำนวนเดือนอย่างน้อย 1 เดือน");
        return;
    }

    let thresholds = {};
    analysisTypes.forEach(type => {
        let slider = document.getElementById(type + "-threshold");
        if (slider) {
            thresholds[type] = parseFloat(slider.value);
        }
    });

    const outputModes = Array.from(document.querySelectorAll('.output-option:checked')).map(option => option.value);

    const priceTable = {
        image: 79,
        video: 119,
        both: 159
    };
    const basePrice = priceTable[packageType];
    if (!basePrice) {
        alert("แพ็กเกจที่เลือกไม่ถูกต้อง");
        return;
    }
    const expectedAmount = basePrice * durationMonths;

    try {
        const response = await fetch(`${window.API_BASE_URL}/generate_qr`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // <<-- แนบ token แทน email
            },
            body: JSON.stringify({
                plan: "premium",
                package: packageType,
                duration_months: durationMonths,
                analysis_types: analysisTypes,
                thresholds: thresholds,
                output_modes: outputModes
            })
        });
        // 🔴 เพิ่มการตรวจสอบ 401 (token หมดอายุ)
        if (response.status === 401) {
            alert("เซสชันของคุณหมดอายุ กรุณาล็อกอินใหม่");
            localStorage.removeItem('token');
            window.location.href = '../login-singup/login.html'; // หรือหน้า login จริงของคุณ
            return;
        }
        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "เกิดข้อผิดพลาดในการสร้าง QR Code");
            return;
        }

        const amount = data.amount ?? expectedAmount;

        sessionStorage.setItem("selectedDurationMonths", durationMonths);
        sessionStorage.setItem("selectedAmount", amount);
        sessionStorage.setItem("selectedPackage", packageType);
        sessionStorage.setItem("selectedAnalysis", JSON.stringify(analysisTypes));
        sessionStorage.setItem("selectedThresholds", JSON.stringify(thresholds));
        sessionStorage.setItem("selectedOutputModes", JSON.stringify(outputModes));
        sessionStorage.setItem("qr_code_url", data.qr_code_url);
        sessionStorage.setItem("ref_code", data.ref_code);
        if (Array.isArray(data.media_access)) {
            sessionStorage.setItem("selectedMediaAccess", JSON.stringify(data.media_access));
        }

        // ไปหน้าชำระเงิน
        window.location.href = "payment.html";

    } catch (err) {
        console.error("Error:", err);
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
}