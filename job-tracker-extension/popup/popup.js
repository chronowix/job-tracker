document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("save-job-btn");
    const statusMsg = document.getElementById("status-message");

    saveBtn.addEventListener("click", () => {
        statusMsg.textContent = "test";
        statusMsg.classList.remove("hidden");
    });
});