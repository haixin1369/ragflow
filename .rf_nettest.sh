#!/bin/bash
# Receive one raw TCP connection and dump what arrives, then respond 200.
(timeout 20 nc -l -p 9999 > /tmp/rawreq.txt; echo "RECEIVED_BYTES=$(wc -c < /tmp/rawreq.txt)"; tail -c 300 /tmp/rawreq.txt | od -c | tail -8) 2>&1
