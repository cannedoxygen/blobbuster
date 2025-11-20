const { SuiClient } = require('@mysten/sui.js/client');

async function testWalrusObject() {
  const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });

  const systemObjectId = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';

  console.log('Querying Walrus system object:', systemObjectId);

  try {
    const obj = await client.getObject({
      id: systemObjectId,
      options: {
        showContent: true,
        showType: true,
      }
    });

    console.log('\n=== OBJECT TYPE ===');
    console.log(obj.data.type);

    console.log('\n=== OBJECT CONTENT ===');
    console.log(JSON.stringify(obj.data.content, null, 2));

    if (obj.data.content?.dataType === 'moveObject') {
      console.log('\n=== FIELDS ===');
      console.log(JSON.stringify(obj.data.content.fields, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWalrusObject();
