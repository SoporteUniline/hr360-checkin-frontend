"use client";
import React from "react";
import { usePathname } from "next/navigation";

import {
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  TelegramIcon,
  TelegramShareButton,
  ThreadsIcon,
  ThreadsShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "react-share";

export default function SocialShare() {
  const location = usePathname();

  const sharedUrl = `${process.env.NEXT_PUBLIC_RUTA_DOMAIN}${location}`;

  return (
    <div className="flex gap-2 my-3">
      <FacebookShareButton url={sharedUrl} quote="{title}">
        <FacebookIcon size={32} round />
      </FacebookShareButton>
      <TwitterShareButton url={sharedUrl} title="{title}">
        <TwitterIcon size={32} round />
      </TwitterShareButton>
      <WhatsappShareButton url={sharedUrl} title="{title}">
        <WhatsappIcon size={32} round />
      </WhatsappShareButton>
      <ThreadsShareButton url={sharedUrl} title="{title}">
        <ThreadsIcon size={32} round />
      </ThreadsShareButton>
      <LinkedinShareButton url={sharedUrl} title="{title}">
        <LinkedinIcon size={32} round />
      </LinkedinShareButton>
      <TelegramShareButton url={sharedUrl} title="{title}">
        <TelegramIcon size={32} round />
      </TelegramShareButton>
      <EmailShareButton url={sharedUrl} title="{title}">
        <EmailIcon size={32} round />
      </EmailShareButton>
    </div>
  );
}
