// 获取从当前月份开始的未来12个月，格式为 YYYY-MM
export const next12Months = () => {
    const result = [];
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1; // JavaScript 月份从 0 开始
    month++;
    if (month > 12) {
        month = 1;
        year++;
    }
    for (let i = 0; i < 12; i++) {
        const formattedMonth = month < 10 ? `0${month}` : `${month}`;
        result.push(`${year}-${formattedMonth}`);
        // result.push(`${formattedMonth}月`);
        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
    }
    return result;
}

// 获取从当前日期开始的未来14天，格式为 YYYY-MM-DD
export const next14Days = () => {
    const result = [];
    const now = new Date();

    for (let i = 0; i < 14; i++) {
        const futureDate = new Date(now);
        futureDate.setDate(now.getDate() + i);
        const year = futureDate.getFullYear();
        const month = futureDate.getMonth() + 1; // JavaScript 月份从 0 开始
        const day = futureDate.getDate();
        const formattedMonth = month < 10 ? `0${month}` : `${month}`;
        const formattedDay = day < 10 ? `0${day}` : `${day}`;
        result.push(`${formattedMonth}-${formattedDay}`);
    }
    return result;
}