'use strict';

const assert = require('assert');
const path = require('path');

const { Gemini } = require(path.join(__dirname, '..', 'index'));
const { Candidate, ModelOutput } = require(path.join(__dirname, '..', 'src', 'types', 'output'));

function buildReadChatResponse(turnsData) {
    const body = JSON.stringify([turnsData]);
    const part = [null, null, body];
    const fullResponse = JSON.stringify([part]);
    return `)]}'\n${fullResponse.length}\n${fullResponse}`;
}

const TEST_RID = 'r_test_rid_abc';
const TEST_RCID = 'rc_test_rcid_xyz';
const TEST_CID = 'c_test_cid_123';
const MODEL_TEXT = 'Hello from the model!';
const USER_TEXT = 'Hello from the user!';

function buildTurnsData() {
    return [
        [
            [TEST_CID, TEST_RID],
            null,
            [[USER_TEXT]],
            [
                [
                    [TEST_RCID, [MODEL_TEXT]],
                ]
            ],
        ]
    ];
}

async function createMockClient(readChatResponse) {
    const client = new Gemini();
    client._ready = true;
    client._guest = false;
    client.accessToken = 'test_token';
    client.buildLabel = 'test_label';
    client.sessionId = 'test_sid';
    client.language = 'en';
    client.pushId = 'test_feed';
    client._reqid = 10000;

    client._batchExecute = async () => ({
        data: readChatResponse,
        status: 200,
        headers: {},
    });

    return client;
}

async function testReadChatReturnsRidRcid() {
    const turnsData = buildTurnsData();
    const response = buildReadChatResponse(turnsData);
    const client = await createMockClient(response);

    const turns = await client.readChat(TEST_CID, 5);
    assert.strictEqual(turns.length, 2, 'Expected 2 turns');

    const modelTurn = turns.find(t => t.role === 'model');
    assert.ok(modelTurn, 'Expected a model turn');
    assert.strictEqual(modelTurn.rid, TEST_RID, 'Model turn should have rid');
    assert.strictEqual(modelTurn.rcid, TEST_RCID, 'Model turn should have rcid');
    assert.strictEqual(modelTurn.text, MODEL_TEXT);

    const userTurn = turns.find(t => t.role === 'user');
    assert.ok(userTurn, 'Expected a user turn');
    assert.strictEqual(userTurn.rid, TEST_RID, 'User turn should have rid');
    assert.strictEqual(userTurn.rcid, undefined, 'User turn should not have rcid');
    assert.strictEqual(userTurn.text, USER_TEXT);

    console.log('  PASS readChat returns rid/rcid on model and user turns');
}

async function testReadChatMultipleModelCandidates() {
    const rid2 = 'r_second_rid';
    const rcid2a = 'rc_second_a';
    const rcid2b = 'rc_second_b';
    const turnsData = [
        [
            ['c_multi', TEST_RID],
            null,
            [['first user msg']],
            [
                [
                    [TEST_RCID, ['first response']],
                ]
            ],
        ],
        [
            ['c_multi', rid2],
            null,
            [['second user msg']],
            [
                [
                    [rcid2a, ['second response A']],
                    [rcid2b, ['second response B']],
                ]
            ],
        ],
    ];
    const response = buildReadChatResponse(turnsData);
    const client = await createMockClient(response);

    const turns = await client.readChat('c_multi', 5);
    const modelTurns = turns.filter(t => t.role === 'model');
    assert.strictEqual(modelTurns.length, 3, 'Expected 3 model turns (1 + 2 candidates)');

    assert.strictEqual(modelTurns[0].rid, TEST_RID);
    assert.strictEqual(modelTurns[0].rcid, TEST_RCID);

    assert.strictEqual(modelTurns[1].rid, rid2);
    assert.strictEqual(modelTurns[1].rcid, rcid2a);

    assert.strictEqual(modelTurns[2].rid, rid2);
    assert.strictEqual(modelTurns[2].rcid, rcid2b);

    console.log('  PASS readChat handles multiple model candidates with distinct rid/rcid');
}

async function testReadChatEmptyTurns() {
    const turnsData = [];
    const response = buildReadChatResponse(turnsData);
    const client = await createMockClient(response);

    const turns = await client.readChat('c_empty', 5);
    assert.strictEqual(turns.length, 0);

    console.log('  PASS readChat returns empty array for empty conversation');
}

async function testReadChatInternalRidInModelOutput() {
    const client = await createMockClient(buildReadChatResponse(buildTurnsData()));

    const result = await client._readChatInternal(TEST_CID);
    assert.ok(result, '_readChatInternal should return a result');
    assert.strictEqual(result.cid, TEST_CID);

    const modelTurn = result.turns.find(t => t.role === 'model');
    assert.ok(modelTurn, 'Expected a model turn');
    assert.ok(modelTurn.model_output, 'Expected model_output on internal turn');

    const mo = modelTurn.model_output;
    assert.ok(mo instanceof ModelOutput, 'model_output should be a ModelOutput instance');
    assert.strictEqual(mo.cid, TEST_CID, 'ModelOutput.cid should match');
    assert.strictEqual(mo.rid, TEST_RID, 'ModelOutput.rid should be the actual rid');
    assert.strictEqual(mo.metadata[0], TEST_CID, 'metadata[0] should be cid');
    assert.strictEqual(mo.metadata[1], TEST_RID, 'metadata[1] should be rid');
    assert.strictEqual(mo.metadata[2], TEST_RCID, 'metadata[2] should be rcid');

    console.log('  PASS _readChatInternal includes rid in ModelOutput metadata');
}

async function testContinueChatMethod() {
    const client = await createMockClient(buildReadChatResponse(buildTurnsData()));
    assert.strictEqual(typeof client.continueChat, 'function', 'continueChat should exist');

    const session = await client.continueChat(TEST_CID);
    assert.strictEqual(session.metadata[0], TEST_CID, 'session metadata[0] should be cid');
    assert.strictEqual(session.metadata[1], TEST_RID, 'session metadata[1] should be rid');
    assert.strictEqual(session.metadata[2], TEST_RCID, 'session metadata[2] should be rcid');
    assert.strictEqual(session.cid, TEST_CID, 'session.cid should be set');
    assert.strictEqual(session.rid, TEST_RID, 'session.rid should be set');
    assert.strictEqual(session.rcid, TEST_RCID, 'session.rcid should be set');

    console.log('  PASS continueChat returns session with correct metadata');
}

async function testContinueChatNoHistory() {
    const client = await createMockClient(buildReadChatResponse([]));
    const session = await client.continueChat('c_no_history');

    assert.strictEqual(session.metadata[0], 'c_no_history', 'cid should be set');
    assert.strictEqual(session.metadata[1], '', 'rid should be empty when no history');
    assert.strictEqual(session.metadata[2], '', 'rcid should be empty when no history');

    console.log('  PASS continueChat with no history returns session with empty rid/rcid');
}

async function testContinueChatGuestMode() {
    const client = new Gemini();
    client._guest = true;

    try {
        await client.continueChat('c_any');
        assert.fail('Should have thrown in guest mode');
    } catch (e) {
        assert.ok(e.message.includes('guest'), `Error should mention guest mode: ${e.message}`);
    }

    console.log('  PASS continueChat throws in guest mode');
}

async function main() {
    console.log('Running rid/rcid tests...\n');

    await testReadChatReturnsRidRcid();
    await testReadChatMultipleModelCandidates();
    await testReadChatEmptyTurns();
    await testReadChatInternalRidInModelOutput();
    await testContinueChatMethod();
    await testContinueChatNoHistory();
    await testContinueChatGuestMode();

    console.log('\nAll tests passed!');
}

main().catch(e => {
    console.error('TEST FAILED:', e);
    process.exit(1);
});
