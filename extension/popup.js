// Cookie Crumbler Popup Script
// Handles user-triggered cookie scrambling

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  const scrambleButton = document.getElementById('scrambleButton');
  const statusDiv = document.getElementById('status');
  
  if (scrambleButton) {
    scrambleButton.addEventListener('click', handleManualScramble);
  }
});

// Handle manual scramble button click
async function handleManualScramble() {
  const statusDiv = document.getElementById('status');
  const scrambleButton = document.getElementById('scrambleButton');
  
  try {
    // Disable button during processing
    scrambleButton.disabled = true;
    statusDiv.textContent = 'Scanning cookies...';
    
    // Call shared scanning function
    const results = await scanAndProcessCookies();
    
    // Display results
    statusDiv.textContent = `Complete! Scrambled ${results.scrambled} tracking cookies, kept ${results.necessary} necessary cookies.`;
    
    // Re-enable button after delay
    setTimeout(() => {
      scrambleButton.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Error during manual scramble:', error);
    statusDiv.textContent = 'Error scrambling cookies. Please try again.';
    scrambleButton.disabled = false;
  }
}
