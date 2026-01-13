require('dotenv').config()
const { createClient } = require('@sanity/client')

const token = process.env.SANITY_TOKEN

if (!token) {
  console.error('❌ Error: SANITY_TOKEN environment variable is not set')
  console.log('\nPlease set your token in .env file')
  process.exit(1)
}

const client = createClient({
  projectId: '5u9e9skw',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: token,
  useCdn: false,
})

// Helper function to generate unique keys for array items
function generateKey() {
  return Math.random().toString(36).substring(2, 11)
}

async function seedData() {
  console.log('🌱 Starting data seeding with NEW schema structure...\n')

  try {
    // 1. Create Chatbot Settings (singleton)
    console.log('1️⃣ Creating Chatbot Settings...')
    const settings = await client.create({
      _type: 'chatbotSettings',
      systemName: 'ResQWave Assistant',
      systemDescription:
        'An AI helper for ResQWave - a LoRa-powered emergency communication system designed to help communities send SOS alerts, share updates, and guide rescuers during flood events.',
      welcomeMessage:
        "Hi there! I'm ResQWave Assistant. How can I help you today?",
      contactEmail: 'resqwaveinfo@gmail.com',
      supportHours: '24/7',
      emergencyContactInfo: {
        hotline: '911',
        instructions:
          'For immediate life-threatening emergencies, call 911. For system support, contact us via email.',
      },
      defaultLanguage: 'en',
      maxResponseLength: 3,
      quickActionCount: 3,
      isMaintenanceMode: false,
      maintenanceMessage: 'The chatbot is temporarily unavailable due to system maintenance. Please try again later. We appreciate your patience.',
    })
    console.log('✅ Settings created:', settings._id, '\n')

    // 2. Create Interpret Distress Signals (singleton)
    console.log('2️⃣ Creating Interpret Distress Signals...')
    const distressSignals = await client.create({
      _type: 'interpretDistressSignals',
      title: 'Interpret Distress Signals',
      isActive: true,
      description:
        'Understand SOS button triggers and auto-flood alerts from IoT terminals.',
      keywords: ['SOS', 'distress', 'alert', 'auto-flood', 'trigger', 'button', 'terminal'],
      points: [
        {
          _key: generateKey(),
          point:
            'LoRa-powered terminals enable continuous distress signaling and location reporting even during power or internet outages.',
          answer:
            'Our terminals use LoRa technology which works independently of cellular networks and the internet, ensuring reliable communication during emergencies.',
          keywords: ['LoRa', 'continuous', 'signaling', 'location', 'outage', 'power', 'internet'],
        },
        {
          _key: generateKey(),
          point: 'SOS button: Press and hold for 5 seconds to send a distress signal.',
          answer:
            'To send an SOS alert, press and hold the red SOS button on your terminal for 5 seconds until the LED turns red.',
          keywords: ['SOS', 'button', 'press', 'hold', '5 seconds', 'distress', 'send'],
        },
        {
          _key: generateKey(),
          point:
            'Water sensor module: Automatically triggers emergency alerts when rising flood levels are detected.',
          answer:
            'The water sensor continuously monitors flood levels and automatically sends alerts when water reaches a dangerous level, even if no one presses the SOS button.',
          keywords: [
            'water sensor',
            'flood',
            'rising',
            'emergency',
            'alert',
            'auto',
            'trigger',
          ],
        },
        {
          _key: generateKey(),
          point:
            'LED indicators: Green (powered), Red (sending distress), Yellow (signal received), Blue (rescue incoming).',
          answer:
            'The LED status lights show: Green when terminal is on, Red when sending SOS, Yellow when signal is received, and Blue when rescue is on the way.',
          keywords: ['LED', 'indicator', 'green', 'red', 'yellow', 'blue', 'status', 'lights'],
        },
        {
          _key: generateKey(),
          point:
            'Dashboard consolidates real-time distress signals and vulnerability data for rescue coordination.',
          answer:
            'The decision support dashboard shows all active distress signals on a map with community information, helping rescuers prioritize and coordinate their response.',
          keywords: [
            'dashboard',
            'decision support',
            'real-time',
            'distress',
            'vulnerability',
            'rescue',
            'coordination',
          ],
        },
      ],
    })
    console.log('✅ Distress Signals created:', distressSignals._id, '\n')

    // 3. Create Handle General Questions (singleton)
    console.log('3️⃣ Creating Handle General Questions...')
    const generalQuestions = await client.create({
      _type: 'handleGeneralQuestions',
      title: 'Handle General Questions',
      isActive: true,
      description: 'Common questions about ResQWave system features and capabilities.',
      keywords: ['FAQ', 'questions', 'general', 'about', 'what', 'how'],
      predefinedAnswers: [
        {
          _key: generateKey(),
          topic: 'What is the purpose of ResQWave?',
          keywords: ['purpose', 'goal', 'mission', 'what is'],
          answer:
            'ResQWave provides reliable emergency communication and rescue coordination for communities during disasters, especially floods, using LoRa-powered terminals that work even when cellular networks fail.',
          userRoles: ['all'],
        },
        {
          _key: generateKey(),
          topic: 'What are the benefits of using ResQWave?',
          keywords: ['benefits', 'advantages', 'why use', 'features'],
          answer:
            'ResQWave enables distress signaling during power or internet outages, improves rescue coordination with real-time mapping, and empowers community participation through accessible terminals.',
          userRoles: ['all'],
        },
        {
          _key: generateKey(),
          topic: 'What technology does ResQWave use?',
          keywords: ['technology', 'technical', 'how it works', 'LoRa', 'IoT'],
          answer:
            'ResQWave uses LoRa-powered IoT terminals, water sensors, LED indicators, and a decision support dashboard to transmit and visualize emergency alerts.',
          userRoles: ['all'],
        },
        {
          _key: generateKey(),
          topic: 'How does ResQWave operate?',
          keywords: ['operation', 'how to use', 'process', 'workflow'],
          answer:
            'Community terminals send alerts via LoRa, which are received by a gateway and displayed on a dashboard for responders. The system supports real-time tracking, reporting, and resource allocation.',
          userRoles: ['residents', 'focal_persons', 'dispatchers'],
        },
        {
          _key: generateKey(),
          topic: 'Who can use ResQWave?',
          keywords: ['users', 'who', 'access', 'roles'],
          answer:
            'Barangay dispatchers, community focal persons, and residents in flood-prone areas can use ResQWave terminals and dashboard.',
          userRoles: ['all'],
        },
        {
          _key: generateKey(),
          topic: 'What is the ResQWave dashboard?',
          keywords: ['dashboard', 'map', 'reports', 'management', 'web'],
          answer:
            'The dashboard provides map-based visualization of distress signals, live reports, community management, and terminal status monitoring for dispatchers and focal persons.',
          userRoles: ['dispatchers', 'focal_persons'],
        },
      ],
    })
    console.log('✅ General Questions created:', generalQuestions._id, '\n')

    // 4. Create User Guidance (singleton)
    console.log('4️⃣ Creating User Guidance...')
    const userGuidance = await client.create({
      _type: 'userGuidance',
      title: 'User Guidance',
      isActive: true,
      description: 'Step-by-step guidance for common tasks and scenarios.',
      keywords: ['how to', 'guide', 'help', 'task', 'instructions'],
      predefinedAnswers: [
        {
          _key: generateKey(),
          task: 'How to send an SOS alert',
          answer:
            'Press and hold the SOS button on your terminal for 5 seconds until the LED turns red—this sends a distress signal.',
          userRoles: ['all'],
        },
        {
          _key: generateKey(),
          task: 'How to check dashboard status',
          answer:
            'Log in to the dashboard and view the map for real-time alerts, community statuses, and rescue operations.',
          userRoles: ['focal_persons', 'dispatchers', 'admins'],
        },
        {
          _key: generateKey(),
          task: 'How to update my personal profile',
          answer:
            'To update your personal profile information, please contact your community focal person or barangay dispatcher. Personal registration details can only be updated by authorized community officials for security reasons.',
          userRoles: ['residents'],
        },
        {
          _key: generateKey(),
          task: 'How to update my personal profile',
          answer:
            'You can update your profile directly in the dashboard. Go to your profile section and edit your personal information such as name, contact number, and address.',
          userRoles: ['focal_persons', 'admins', 'dispatchers'],
        },
        {
          _key: generateKey(),
          task: 'How to update community info',
          answer:
            'Go to your dashboard profile, select your community, and update details like household count, flood risk, and focal person information.',
          userRoles: ['focal_persons', 'admins'],
        },
        {
          _key: generateKey(),
          task: 'What to do during a flood emergency',
          answer:
            'Send an SOS alert using your terminal, follow instructions from barangay officials, and stay updated via community announcements.',
          userRoles: ['all'],
        },
        {
          _key: generateKey(),
          task: 'How to acknowledge a received signal',
          answer:
            'Confirm the alert in the dashboard, dispatch rescue if needed, and send a response to the terminal to change the LED status to blue.',
          userRoles: ['dispatchers', 'admins'],
        },
        // Focal Person Troubleshooting
        {
          _key: generateKey(),
          task: 'What to do if a terminal is not responding or connecting',
          answer: 'First, check if the terminal has power and the battery is charged. Try restarting the terminal by unplugging and reconnecting it. Verify the LoRa antenna is properly attached. If the issue persists, contact your barangay dispatcher or admin to check network connectivity.',
          userRoles: ['focal_persons', 'dispatchers', 'admins'],
        },
        {
          _key: generateKey(),
          task: 'Why are SOS alerts not being received',
          answer: 'Check if the resident\'s terminal is powered on and has battery. Verify the terminal\'s LED indicator is functioning. Ensure the dashboard shows active connection status. If alerts still don\'t appear, check the LoRa gateway connectivity or contact your admin to investigate network issues.',
          userRoles: ['focal_persons', 'dispatchers', 'admins'],
        },
        {
          _key: generateKey(),
          task: 'What to do if the dashboard map is not loading',
          answer: 'Try refreshing your browser or clearing the cache. Check your internet connection. If using mobile, ensure you have stable data or WiFi. Log out and log back in. If the problem continues, try a different browser or contact technical support.',
          userRoles: ['focal_persons', 'dispatchers', 'admins'],
        },
        {
          _key: generateKey(),
          task: 'What to do if a resident cannot send alerts',
          answer: 'Verify the resident\'s terminal is powered on and charged. Test the SOS button by pressing and holding for 5 seconds—check if the LED turns red. Ensure the resident is properly registered in the system. If the terminal doesn\'t respond, it may need replacement—coordinate with your dispatcher or admin.',
          userRoles: ['focal_persons', 'dispatchers', 'admins'],
        },
        {
          _key: generateKey(),
          task: 'What do the LED indicator colors mean',
          answer: 'Red LED means distress signal sent (SOS active). Blue LED means the alert has been acknowledged by authorities. Green LED indicates normal operation. Flashing lights may indicate connection or power issues. If LED doesn\'t respond, the terminal may need servicing.',
          userRoles: ['focal_persons', 'dispatchers', 'admins', 'residents'],
        },
        {
          _key: generateKey(),
          task: 'Why is community status not updating',
          answer: 'Refresh your dashboard to sync the latest data. Check if your internet connection is stable. Verify that community information was saved properly after your last update. If data still doesn\'t sync, log out and log back in, or contact your admin to check backend synchronization.',
          userRoles: ['focal_persons', 'admins'],
        },
        {
          _key: generateKey(),
          task: 'How to fix profile or community info update issues',
          answer: 'Go to your profile section in the dashboard and verify all required fields are filled correctly. Make sure to click the save button after making changes. If updates don\'t save, check your internet connection and try again. Clear your browser cache if the issue persists, or contact support.',
          userRoles: ['focal_persons', 'admins', 'dispatchers'],
        },
      ],
    })
    console.log('✅ User Guidance created:', userGuidance._id, '\n')

    // 5. Create Clarification Requests Fallback (singleton)
    console.log('5️⃣ Creating Clarification Requests Fallback...')
    const clarificationFallback = await client.create({
      _type: 'clarificationRequestsFallback',
      isActive: true,
      title: 'Clarification Requests & Fallback',
      description: 'Messages to use when user input is unclear or ambiguous.',
      keywords: ['unclear', 'clarify', 'fallback', 'confused', 'rephrase'],
      messages: [
        {
          _key: generateKey(),
          message: "I didn't quite catch that. Could you please clarify your question about ResQWave?",
        },
        {
          _key: generateKey(),
          message:
            "Can you rephrase or provide more details? I'm here to help with anything about ResQWave's system or features.",
        },
        {
          _key: generateKey(),
          message:
            "I'm not sure I understand. Would you like to know about ResQWave's technology, operation, or benefits?",
        },
        {
          _key: generateKey(),
          message: "Could you tell me a bit more about what you're looking for regarding ResQWave?",
        },
        {
          _key: generateKey(),
          message:
            'Let me know if you want to ask about SOS alerts, the dashboard, or how ResQWave works!',
        },
      ],
    })
    console.log('✅ Clarification Fallback created:', clarificationFallback._id, '\n')

    // 6. Create Safety Tips & Preparedness (singleton)
    console.log('6️⃣ Creating Safety Tips & Preparedness...')
    const safetyTips = await client.create({
      _type: 'safetyTipsPreparedness',
      isActive: true,
      title: 'Safety Tips & Preparedness Guidance',
      description: 'Emergency preparedness information and safety guidelines.',
      keywords: ['safety', 'tips', 'preparedness', 'emergency', 'flood', 'evacuation'],
      predefinedAnswers: [
        {
          _key: generateKey(),
          topic: 'Flood safety tips',
          answer:
            'Move to higher ground immediately when flooding begins. Avoid walking or driving through floodwaters. Keep emergency supplies ready (water, food, flashlight, radio, first aid kit).',
        },
        {
          _key: generateKey(),
          topic: 'Emergency kit checklist',
          answer:
            'Every household should have: clean drinking water (3 days supply), non-perishable food, flashlight and batteries, battery-powered radio, first aid kit with medicines, important documents in waterproof container, personal hygiene items.',
        },
        {
          _key: generateKey(),
          topic: 'Family emergency plan',
          answer:
            'Agree on a safe meeting place, share contact information with all family members, make sure everyone knows how to use the ResQWave terminal, and practice your emergency plan regularly.',
        },
        {
          _key: generateKey(),
          topic: 'Power outage safety',
          answer:
            'Use battery-powered lights instead of candles, unplug electronics to prevent damage from power surges, keep your phone charged for emergency updates, avoid opening refrigerator to keep food cold longer.',
        },
        {
          _key: generateKey(),
          topic: 'Evacuation advice',
          answer:
            'Follow instructions from local officials, bring your emergency kit and important documents, help neighbors who may need assistance, lock your home and turn off utilities if time permits.',
        },
        {
          _key: generateKey(),
          topic: 'Staying informed',
          answer:
            'Listen to official announcements from authorities, monitor the ResQWave dashboard or community updates, avoid spreading unverified information, share official updates with family and neighbors.',
        },
      ],
    })
    console.log('✅ Safety Tips created:', safetyTips._id, '\n')

    // 7. Create Contact Information (singleton)
    console.log('7️⃣ Creating Contact Information...')
    const contactInfo = await client.create({
      _type: 'contactInformation',
      isActive: true,
      title: 'Contact Information',
      description: 'Official contact details and support information.',
      keywords: ['contact', 'support', 'help', 'email', 'phone', 'reach'],
      email: 'resqwaveinfo@gmail.com',
      phone: '911',
      supportHours: '24/7',
      exampleResponses: [
        {
          _key: generateKey(),
          response:
            'You can reach our support team at resqwaveinfo@gmail.com. We provide 24/7 assistance for system-related inquiries.',
        },
        {
          _key: generateKey(),
          response:
            'For immediate life-threatening emergencies, call 911. For ResQWave system support, email us at resqwaveinfo@gmail.com.',
        },
        {
          _key: generateKey(),
          response:
            'Need help? Contact resqwaveinfo@gmail.com or speak with your community focal person or barangay dispatcher.',
        },
      ],
    })
    console.log('✅ Contact Information created:', contactInfo._id, '\n')

    console.log('🎉 Data seeding completed successfully!')
    console.log('\n📝 Summary:')
    console.log('- 1 Chatbot Settings')
    console.log('- 1 Interpret Distress Signals')
    console.log('- 1 Handle General Questions')
    console.log('- 1 User Guidance')
    console.log('- 1 Clarification Requests Fallback')
    console.log('- 1 Safety Tips & Preparedness')
    console.log('- 1 Contact Information')
    console.log('\n✅ You can now view and edit this content in Sanity Studio at http://localhost:3333')
  } catch (error) {
    console.error('\n❌ Error seeding data:', error.message)
    if (error.statusCode === 401) {
      console.error('\n🔑 Authentication failed. Please check your SANITY_TOKEN')
    } else if (error.statusCode === 403) {
      console.error('\n🚫 Permission denied. Make sure your token has Editor or Admin permissions')
    } else {
      console.error('\nFull error:', error)
    }
    process.exit(1)
  }
}

// Run the seeding function
seedData()
