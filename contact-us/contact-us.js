document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Simple validation
        let valid = true;
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(input => {
            if (!input.value.trim()) {
                input.style.borderColor = 'red';
                valid = false;
            } else {
                input.style.borderColor = '';
            }
        });

        if (!valid) {
            showToast('Please fill in all required fields.', 'danger');
            return;
        }

        // Disable button & show spinner
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Sending... <i class="glyphicon glyphicon-refresh spinning"></i>';

        const formData = new FormData(form);

        fetch('https://formspree.io/f/meqygpad', {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: formData
        })
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (ok) {
                    showToast('✅ Message sent successfully!', 'success');
                    form.reset();
                } else {
                    showToast(data?.errors?.[0]?.message || 'Submission failed.', 'danger');
                }
            })
            .catch(() => showToast('Network error.', 'danger'))
            .finally(() => {
                // Re-enable button and reset label
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
    });

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type}`;
        toast.textContent = message;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
});