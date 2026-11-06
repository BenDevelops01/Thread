import json, urllib.request, urllib.error, uuid, os
base=os.environ['THREAD_SUPABASE_URL'].rstrip('/')+'/functions/v1/'
def post(name,data,headers={}):
    req=urllib.request.Request(base+name,data=json.dumps(data).encode(),headers={'Content-Type':'application/json',**headers})
    try:
        with urllib.request.urlopen(req) as r: return r.status,json.load(r)
    except urllib.error.HTTPError as e:return e.code,json.load(e)
email='qa-'+str(uuid.uuid4())+'@example.invalid'
statuses=[post('thread-auth',{'email':email,'password':'NeverARealAccount10!','action':'signin'})[0] for _ in range(11)]
assert statuses[:10]==[400]*10,statuses
assert statuses[10]==429,statuses
assert post('thread-events',{'status':'working'})[0]==401
assert post('thread-connect',{})[0]==401
assert post('thread-billing',{})[0]==401
print('PASS: first 10 sign-in attempts processed; attempt 11 blocked; unauthenticated webhook, connection and billing requests rejected. No account created.')
