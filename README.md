# learn2p2p
Experiments in file sharing.

## Introduction
In an attempt to learn how modern P2P file sharing networks work, I decided to build one from the ground up. This repo and its contents is a fully functional, distributed file sharing application, where participating users can both upload and download files.

However, the goal of this project is purely educational, and has not been vetted in production environments and use cases. I am also not an expert, I'm just a person who wants to learn, so if you see something that you'd like to add, clarify, or change, I'd be happy to.

## Peer-to-peer and file sharing
There are many incarnations of P2P networks. In most cases, they function as distributed file sharing networks, where a user can upload a file to their peers (either as whole files or in pieces), and consequently those who wish to download a particular file can download different parts of that file from different peers. This accomplishes a few things:
- Increased download speed, by downloading different parts of the same file from different peers in parallel
- Increased resilience to poor network performance or low bandwidth
- Increased redundancy and availability of data

Note that all of the above benefits are only truly realized when peers are actively contributing to the network. In older networks, this required peers to hold specific files in order to make them available. Modern P2P networks use a different mechanism, where each peer is responsible for small pieces. Therefore, the only requirement for a peer to contribute to the network is to be online and to allot some space for storage.

## What we're building
In this project, users start their own peer **servers** on their machines. They can then use **clients** to communicate with your particular peer server in order to upload to or download from the network. The network is simply an interconnected collection of peer servers. When a file is uploaded, it is broken down into content-addressable pieces (called **blocks**). These blocks are then assigned and distributed to a specific subset of active peers on the network. Peers discover and interact with other peers via a data structure called a distributed hash table (**DHT**). Our DHT implementation is modelled after the **Kademlia** DHT.

There's a lot to take in and understand in the above description. What are blocks? What does it mean that a block is content-addressable? What is a DHT and how does it work? What's Kademlia?

We will get to these answers and more below. Notice that the `src` directory of this project is also modelled almost exactly after these concepts. As we delve into the code, you will also notice that I make use of a lot of abstract classes, followed by implementations of those classes. I've also separated out the components that are related or contribute to the primary ideas. Both of these approaches are to help separate the concept from its implementation, and helps you to see the raw properties of the concept rather than being inundated by its implementation details.
    


