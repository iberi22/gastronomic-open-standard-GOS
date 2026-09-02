/**
 * P2P Peer Discovery for GOS PWA
 * 3 levels: GitHub DHT bootstrap, mDNS LAN, QR Code exchange
 */

const GITHUB_BOOTSTRAP_URL = 'https://raw.githubusercontent.com/iberi22/gos-p2p-data/main/sync/_bootstrap.json';

// ============================================
// PEER DISCOVERY CLASS
// ============================================
export class PeerDiscovery {
  private country: string;
  private userId: string;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private onPeerConnected?: (peerId: string) => void;
  private onPeerData?: (peerId: string, data: any) => void;

  constructor(country: string, userId: string, callbacks?: {
    onPeerConnected?: (peerId: string) => void;
    onPeerData?: (peerId: string, data: any) => void;
  }) {
    this.country = country;
    this.userId = userId;
    this.onPeerConnected = callbacks?.onPeerConnected;
    this.onPeerData = callbacks?.onPeerData;
  }

  // ============================================
  // LEVEL 1: GitHub Bootstrap DHT
  // ============================================
  async bootstrapFromGitHub(): Promise<void> {
    try {
      const res = await fetch(GITHUB_BOOTSTRAP_URL);
      const data = await res.json();
      const peers = data.peers || [];

      for (const peer of peers) {
        if (peer.country === this.country && peer.online && peer.id !== this.userId) {
          await this.connectToPeer(peer);
        }
      }
      console.log(`[PeerDiscovery] Bootstrap: ${peers.length} peers, ${this.peerConnections.size} connected`);
    } catch (err) {
      console.warn('[PeerDiscovery] Bootstrap failed (offline?)', err);
    }
  }

  // ============================================
  // LEVEL 2: WebRTC Connection
  // ============================================
  async connectToPeer(peer: { id: string; host?: string; port?: number }): Promise<void> {
    if (this.peerConnections.has(peer.id)) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    const channel = pc.createDataChannel('gos-sync', {
      ordered: true,
      protocol: 'gos-sync-v1',
    });

    channel.onopen = () => {
      console.log('[PeerDiscovery] Channel open with:', peer.id);
      this.dataChannels.set(peer.id, channel);
      this.onPeerConnected?.(peer.id);
      this.send(peer.id, { type: 'HELLO', userId: this.userId, country: this.country });
    };

    channel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(peer.id, msg);
      } catch { /* binary data, ignore */ }
    };

    channel.onclose = () => {
      this.dataChannels.delete(peer.id);
      this.peerConnections.delete(peer.id);
    };

    this.peerConnections.set(peer.id, pc);

    // Create offer and set up signaling
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      // In production: send offer via signaling server or QR
    } catch (err) {
      console.error('[PeerDiscovery] Connection failed:', peer.id, err);
      this.peerConnections.delete(peer.id);
    }
  }

  // ============================================
  // MESSAGING
  // ============================================
  send(peerId: string, data: any): void {
    const channel = this.dataChannels.get(peerId);
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify(data));
    }
  }

  broadcast(data: any): void {
    for (const [peerId] of this.dataChannels) {
      this.send(peerId, data);
    }
  }

  private handleMessage(peerId: string, msg: any): void {
    switch (msg.type) {
      case 'HELLO':
        console.log('[PeerDiscovery] Peer hello:', msg.userId, msg.country);
        this.send(peerId, { type: 'HELLO_ACK', userId: this.userId, country: this.country });
        break;

      case 'HELLO_ACK':
        console.log('[PeerDiscovery] Handshake complete:', peerId);
        break;

      case 'SYNC_REQUEST':
        this.send(peerId, { type: 'SYNC_DATA', data: { /* local changes */ } });
        break;

      case 'SYNC_DATA':
        this.onPeerData?.(peerId, msg.data);
        break;

      case 'NEW_REVIEW':
        this.onPeerData?.(peerId, msg.review);
        break;
    }
  }

  // ============================================
  // LEVEL 3: QR Code Exchange
  // ============================================
  async createInvite(): Promise<string> {
    const pc = this.peerConnections.values().next().value;
    if (!pc?.localDescription) {
      throw new Error('No active peer connection to invite');
    }
    return JSON.stringify({
      type: 'gos-invite',
      version: '1.0.0',
      country: this.country,
      userId: this.userId,
      sdp: pc.localDescription,
    });
  }

  async acceptInvite(qrData: string): Promise<void> {
    try {
      const invite = JSON.parse(qrData);
      if (invite.type !== 'gos-invite') throw new Error('Invalid invite');

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      await pc.setRemoteDescription(new RTCSessionDescription(invite.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.peerConnections.set(invite.userId, pc);
      console.log('[PeerDiscovery] QR invite accepted:', invite.userId);
    } catch (err) {
      console.error('[PeerDiscovery] Invalid QR invite', err);
    }
  }

  // ============================================
  // STATUS
  // ============================================
  getConnectedPeers(): string[] {
    return Array.from(this.dataChannels.keys());
  }

  disconnect(peerId: string): void {
    this.dataChannels.get(peerId)?.close();
    this.peerConnections.get(peerId)?.close();
    this.dataChannels.delete(peerId);
    this.peerConnections.delete(peerId);
  }

  disconnectAll(): void {
    for (const peerId of this.peerConnections.keys()) {
      this.disconnect(peerId);
    }
  }
}

export default PeerDiscovery;
