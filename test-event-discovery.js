// Test the enhanced event discovery system
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testEventDiscovery() {
  console.log('🎯 Testing Enhanced Event Discovery System\n');

  try {
    // Test 1: TTU Events
    console.log('1. Testing TTU Events...');
    const ttuResponse = await fetch(`${BASE_URL}/api/events/ttu?limit=5`);
    const ttuData = await ttuResponse.json();
    console.log(`   ✅ Found ${ttuData.events?.length || 0} TTU events`);
    if (ttuData.events?.length > 0) {
      console.log(`   📝 Sample: ${ttuData.events[0].title}`);
      console.log(`   🏷️  Tags: ${ttuData.events[0].tags?.join(', ')}`);
    }
    console.log('');

    // Test 2: Lubbock Events
    console.log('2. Testing Lubbock Local Events...');
    const lubbockResponse = await fetch(`${BASE_URL}/api/events/lubbock?limit=5`);
    const lubbockData = await lubbockResponse.json();
    console.log(`   ✅ Found ${lubbockData.events?.length || 0} Lubbock events`);
    if (lubbockData.events?.length > 0) {
      console.log(`   📝 Sample: ${lubbockData.events[0].title}`);
      console.log(`   📍 Location: ${lubbockData.events[0].location}`);
    }
    console.log('');

    // Test 3: Academic Events
    console.log('3. Testing Academic Events...');
    const academicResponse = await fetch(`${BASE_URL}/api/events/category/academic?limit=3`);
    const academicData = await academicResponse.json();
    console.log(`   ✅ Found ${academicData.events?.length || 0} academic events`);
    if (academicData.events?.length > 0) {
      console.log(`   📝 Sample: ${academicData.events[0].title}`);
    }
    console.log('');

    // Test 4: Tech Events
    console.log('4. Testing Tech Events...');
    const techResponse = await fetch(`${BASE_URL}/api/events/category/tech?limit=3`);
    const techData = await techResponse.json();
    console.log(`   ✅ Found ${techData.events?.length || 0} tech events`);
    if (techData.events?.length > 0) {
      console.log(`   📝 Sample: ${techData.events[0].title}`);
    }
    console.log('');

    // Test 5: Custom Discovery with Keywords
    console.log('5. Testing Custom Discovery with Keywords...');
    const customResponse = await fetch(`${BASE_URL}/api/events/discover?keywords=student,research,music&categories=university,cultural`);
    const customData = await customResponse.json();
    console.log(`   ✅ Found ${customData.events?.length || 0} custom events`);
    console.log(`   🔍 Keywords used: ${customData.metadata?.keywordsUsed?.join(', ')}`);
    console.log(`   📂 Categories: ${customData.metadata?.categoriesSearched?.join(', ')}`);
    if (customData.events?.length > 0) {
      console.log(`   📝 Sample: ${customData.events[0].title}`);
      console.log(`   🏷️  Tags: ${customData.events[0].tags?.join(', ')}`);
    }
    console.log('');

    // Test 6: Newsletter with Enhanced Events
    console.log('6. Testing Newsletter Generation with Enhanced Events...');
    
    // First create a test user
    const testUserId = 'test-user-123';
    
    const newsletterResponse = await fetch(`${BASE_URL}/api/users/${testUserId}/newsletters/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (newsletterResponse.ok) {
      const newsletterData = await newsletterResponse.json();
      console.log(`   ✅ Newsletter generated successfully`);
      console.log(`   📰 Title: ${newsletterData.newsletter?.title}`);
      console.log(`   📊 Topics: ${newsletterData.newsletter?.topics?.join(', ')}`);
      console.log(`   🔗 Sources analyzed: ${newsletterData.metadata?.sourcesUsed?.length || 0}`);
    } else {
      console.log(`   ⚠️  Newsletter generation failed (expected if user doesn't exist)`);
    }
    console.log('');

    // Summary
    console.log('📊 Event Discovery Test Summary:');
    console.log(`   • TTU Events: ${ttuData.events?.length || 0}`);
    console.log(`   • Lubbock Events: ${lubbockData.events?.length || 0}`);
    console.log(`   • Academic Events: ${academicData.events?.length || 0}`);
    console.log(`   • Tech Events: ${techData.events?.length || 0}`);
    console.log(`   • Custom Discovery: ${customData.events?.length || 0}`);
    
    const totalEvents = (ttuData.events?.length || 0) + 
                       (lubbockData.events?.length || 0) + 
                       (academicData.events?.length || 0) + 
                       (techData.events?.length || 0) + 
                       (customData.events?.length || 0);
    
    console.log(`   🎯 Total Events Discovered: ${totalEvents}`);
    
    if (totalEvents > 0) {
      console.log('\n🎉 Enhanced Event Discovery is working! Much more variety expected.');
    } else {
      console.log('\n⚠️  No events found - check internet connection and search APIs');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running on port 3000:');
      console.log('   npm run dev');
    }
  }
}

// Run the tests
testEventDiscovery();
