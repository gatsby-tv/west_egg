// import { Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
// import Channel from "./Channel";
// import Uploadable from "./Uploadable";
// import Video from "./Video";

// @Entity()
// export default class Sequence extends Uploadable {
//   constructor(displayName: string, channel: Channel) {
//     super(displayName);
//     this.channel = channel;
//   }

//   @ManyToOne((type) => Channel, (channel) => channel.sequences)
//   @JoinColumn({ name: "channel" })
//   public channel: Channel;

//   @OneToMany((type) => Video, (video) => video.uploadable)
//   public videos?: Video[];

//   public toJSON() {
//     return {};
//   }
// }
