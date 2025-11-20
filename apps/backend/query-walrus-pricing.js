const { SuiClient } = require('@mysten/sui.js/client');

async function queryWalrusPricing() {
  const client = new SuiClient({ 
    url: 'https://fullnode.mainnet.sui.io:443' 
  });

  const WALRUS_SYSTEM_OBJECT = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';

  console.log('Querying Walrus system object...\n');

  try {
    const systemObject = await client.getObject({
      id: WALRUS_SYSTEM_OBJECT,
      options: {
        showContent: true,
        showType: true,
        showDisplay: true,
      },
    });

    console.log('Walrus System Object:');
    console.log(JSON.stringify(systemObject, null, 2));

    if (systemObject.data && systemObject.data.content) {
      console.log('\n=== PARSED FIELDS ===');
      const fields = systemObject.data.content.fields;
      console.log(JSON.stringify(fields, null, 2));
    }
  } catch (error) {
    console.error('Error querying Walrus system:', error.message);
  }
}

queryWalrusPricing();
