function setupPasswordToggle(password, button) {
  const toggleIcon = button.querySelector('i');
  button.addEventListener('click', () => {
    const isPassword = password.type === 'password';
    password.type = isPassword ? 'text' : 'password';
    toggleIcon.classList.toggle('ri-eye-line', !isPassword);
    toggleIcon.classList.toggle('ri-eye-off-line', isPassword);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const passwordInputs = document.querySelectorAll('input[type="password"]');

  passwordInputs.forEach((input, index) => {
    // Ensure input has an ID
    if (!input.id) {
      input.id = `password-input-${index}`;
    }

    // Wrap input if needed (for absolute positioning)
    const wrapper = document.createElement('div');
    wrapper.className = 'position-relative';

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    // Create toggle button
    const button = document.createElement('button');

    button.type = 'button';
    button.className =
      'btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon cursor-pointer';
    button.style.zIndex = '10';
    button.style.pointerEvents = 'auto';

    button.innerHTML = `
      <i class="ri-eye-line align-middle"></i>
    `;

    wrapper.appendChild(button);

    // Attach toggle logic
    setupPasswordToggle(input, button);
  });
});
