require('dotenv').config()
const {createClient} = require('@sanity/client')

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

async function deleteAllDocuments() {
  console.log('🗑️  Starting to delete all chatbot documents...\n')

  const documentTypes = [
    'chatbotSettings',
    'interpretDistressSignals',
    'handleGeneralQuestions',
    'userGuidance',
    'clarificationRequestsFallback',
    'safetyTipsPreparedness',
    'contactInformation',
  ]

  try {
    for (const docType of documentTypes) {
      console.log(`Deleting all ${docType} documents...`)
      
      // Fetch all documents of this type
      const docs = await client.fetch(`*[_type == "${docType}"]._id`)
      
      if (docs.length === 0) {
        console.log(`  ℹ️  No ${docType} documents found`)
        continue
      }

      // Delete all documents
      for (const id of docs) {
        await client.delete(id)
        console.log(`  ✅ Deleted: ${id}`)
      }
      
      console.log(`  📊 Deleted ${docs.length} ${docType} document(s)\n`)
    }

    console.log('🎉 All chatbot documents deleted successfully!')
    console.log('\n✨ You can now run the seed script without duplicates')
  } catch (error) {
    console.error('\n❌ Error deleting documents:', error.message)
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

// Run the delete function
deleteAllDocuments()
