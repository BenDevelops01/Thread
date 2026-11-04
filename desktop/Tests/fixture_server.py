import json, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        if self.path.startswith('/redirect'):
            self.send_response(302); self.send_header('Location', '/v1/models'); self.end_headers(); return
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers()
        self.wfile.write(json.dumps({'data':[{'id':'fixture-chat'}]}).encode())
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))))
        model=body.get('model')
        if model=='unauthorized':
            self.send_response(401); self.end_headers(); return
        self.send_response(200); self.send_header('Content-Type','text/event-stream'); self.end_headers()
        def event(obj):
            content=obj if isinstance(obj,str) else json.dumps(obj,ensure_ascii=False)
            self.wfile.write(('data: '+content+'\n\n').encode()); self.wfile.flush()
        try:
            if model=='api-error': event({'error':{'message':'test failure'}}); return
            if model=='malformed': event('bad-json'); return
            if model=='empty': event('[DONE]'); return
            if model=='slow': time.sleep(2)
            for text in ['Hello ', '🌏', ' from Thread.']:
                if self.path.endswith('/messages'): event({'type':'content_block_delta','delta':{'type':'text_delta','text':text}})
                else: event({'choices':[{'delta':{'content':text},'finish_reason':None}]})
                time.sleep(.025)
            if model=='truncated': return
            if self.path.endswith('/messages'): event({'type':'message_stop'})
            else: event('[DONE]')
        except (BrokenPipeError, ConnectionResetError): pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
with open(sys.argv[1],'w') as f: f.write(str(server.server_port))
server.serve_forever()
