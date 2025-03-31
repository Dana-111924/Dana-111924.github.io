// Main JavaScript functionality

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    // Add mobile menu functionality
    const mobileMenuButton = document.createElement('button');
    mobileMenuButton.className = 'sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500';
    mobileMenuButton.innerHTML = `
        <span class="sr-only">Open main menu</span>
        <svg class="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
    `;

    const nav = document.querySelector('nav');
    const navLinks = document.querySelector('.sm\\:flex');
    
    if (nav && navLinks) {
        nav.insertBefore(mobileMenuButton, navLinks);
        
        mobileMenuButton.addEventListener('click', () => {
            navLinks.classList.toggle('hidden');
        });
    }

    // Add fade-in animation to elements
    const fadeElements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });

    fadeElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';
        element.style.transition = 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out';
        observer.observe(element);
    });

    // Add smooth scrolling to anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add Google AdSense code
    const adScript = document.createElement('script');
    adScript.async = true;
    adScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=pub-6436981981397527';
    adScript.crossOrigin = 'anonymous';
    document.head.appendChild(adScript);

    // Add AdSense ad units
    const adUnits = [
        {
            slot: 'header-ad',
            format: 'auto',
            responsive: true
        },
        {
            slot: 'sidebar-ad',
            format: 'auto',
            responsive: true
        },
        {
            slot: 'footer-ad',
            format: 'auto',
            responsive: true
        }
    ];

    // Initialize AdSense ads
    adUnits.forEach(unit => {
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error('Error initializing AdSense:', e);
        }
    });
});

// Function to load content dynamically
async function loadContent(path) {
    try {
        const response = await fetch(path);
        const content = await response.text();
        return content;
    } catch (error) {
        console.error('Error loading content:', error);
        return '<p>Error loading content. Please try again later.</p>';
    }
}

// Function to handle navigation
function handleNavigation(path) {
    loadContent(path).then(content => {
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = content;
        }
    });
}

// Add event listeners for navigation
document.addEventListener('click', function(e) {
    if (e.target.matches('a[href^="/"]')) {
        e.preventDefault();
        handleNavigation(e.target.getAttribute('href'));
    }
}); 