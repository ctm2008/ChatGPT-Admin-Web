'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import useSWR from 'swr';

import { Avatar } from '@/components/avatar';
import { IconButton } from '@/components/button';
import { Loading } from '@/components/loading';
import { showModal } from '@/components/ui-lib';
import { useModelData } from '@/hooks/data/use-model';
import BrainIcon from '@/icons/brain.svg';
import DownloadIcon from '@/icons/download.svg';
import ExportIcon from '@/icons/export.svg';
import TestIcon from '@/icons/test.svg';
import DeleteIcon from '@/icons/delete-alt.svg';
import ReloadIcon from '@/icons/reload.svg';
import MenuIcon from '@/icons/menu.svg';
import StopIcon from '@/icons/stop.svg';
import SendWhiteIcon from '@/icons/send-white.svg';
import ShoppingIcon from '@/icons/shopping.svg';
import LoadingIcon from '@/icons/three-dots.svg';
import CommandIcon from '@/icons/command.svg';
import UserIcon from '@/icons/user.svg';
import CopyIcon from '@/icons/copy.svg';
import Locale from '@/locales';
import { useStore } from '@/store';
import { SubmitKey, Theme } from '@/store/shared';
import styles from '@/styles/module/home.module.scss';
import clsx from 'clsx';
import {
  copyToClipboard,
  downloadAs,
  isIOS,
  selectOrCopy,
} from '@/utils/client-utils';

import { ChatMessage, ChatSession, ChatSessionWithMessage } from 'shared';

function useSubmitHandler() {
  const config = useStore((state) => state.config);
  const submitKey = config.submitKey;

  const shouldSubmit = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return false;

    return (
      (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
      (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
      (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
      (config.submitKey === SubmitKey.Enter &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.metaKey)
    );
  };

  return {
    submitKey,
    shouldSubmit,
  };
}

// function showMemoryPrompt(session: ChatSession) {
//   showModal({
//     title: `${Locale.Memory.Title} (${session.lastSummarizeIndex} of ${session.messages.length})`,
//     children: (
//       <div className="markdown-body">
//         <pre className={styles["export-content"]}>
//           {session.memoryPrompt || Locale.Memory.EmptyContent}
//         </pre>
//       </div>
//     ),
//     actions: [
//       <IconButton
//         key="copy"
//         icon={<CopyIcon />}
//         bordered
//         text={Locale.Memory.Copy}
//         onClick={() => copyToClipboard(session.memoryPrompt)}
//       />,
//     ],
//   });
// }

const Markdown = dynamic(
  async () => (await import('@/components/markdown')).Markdown,
  {
    loading: () => <LoadingIcon />,
  },
);

export default function Chat() {
  const { getModelName } = useModelData();
  // 侧边栏
  const [sidebarOpen, setSideBarOpen] = useStore((state) => [
    state.showSideBar,
    state.setShowSideBar,
  ]);

  // 对话
  const [
    requestChat,
    sessionId,
    session,
    messages,
    updateSessionId,
    getIsStreaming,
    onUserStop, // stop response
  ] = useStore((state) => [
    state.requestChat,
    state.currentChatSessionId,
    state.currentChatSession,
    state.currentChatSessionMessages,
    state.updateSessionId,
    state.isStreaming,
    state.stopStreaming,
  ]);

  const [userInput, setUserInput] = useState('');
  const isStreaming = getIsStreaming();

  const { submitKey, shouldSubmit } = useSubmitHandler();

  // submit user input
  const onUserSubmit = () => {
    if (userInput.length <= 0) return;

    requestChat(userInput);
    setUserInput('');
    inputRef.current?.focus();
  };

  // check if you should send message
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (shouldSubmit(e.nativeEvent)) {
      onUserSubmit();
      e.preventDefault();
    }
  };

  const onRightClick = (e: any, message: ChatMessage) => {
    // auto fill user input
    if (message.role === 'user') {
      setUserInput(message.content);
    }

    // copy to clipboard
    if (selectOrCopy(e.currentTarget, message.content)) {
      e.preventDefault();
    }
  };

  // const onResend = (botIndex: number) => {
  //   if (!session) return;
  //   // find last user input message and resend
  //   for (let i = botIndex; i >= 0; i -= 1) {
  //     if (session.messages[i].role === "user") {
  //       setIsLoading(true);
  //       requestChat(session.messages[i].content).then(() =>
  //         setIsLoading(false),
  //       );
  //       return;
  //     }
  //   }
  // };

  // for auto-scroll
  const latestMessageRef = useRef<HTMLDivElement>(null);

  // won't scroll while hovering messages
  const [autoScroll, setAutoScroll] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // useEffect(() => {
  //   if (props.sid !== sessionId) {
  //     updateSessionId(props.sid);
  //   }
  // }, [props.sid, sessionId, updateSessionId]);

  // auto scroll
  useLayoutEffect(() => {
    setTimeout(() => {
      const dom = latestMessageRef.current;
      if (dom && !isIOS() && autoScroll) {
        dom.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    }, 500);
  });

  if (!messages) {
    return <Loading />;
  }

  return (
    <div className={styles.chat}>
      <div className={styles['window-header']}>
        <div
          className={styles['window-header-title']}
          onClick={() => setSideBarOpen(true)}
        >
          <div className={styles['window-header-main-title']}>
            {session?.topic ?? '新的对话'}
          </div>
          <div className={styles['window-header-sub-title']}>
            {Locale.Chat.SubTitle(messages?.length ?? 0)}
          </div>
        </div>

        <div className={styles['window-actions']}>
          <div className={styles['window-action-button'] + ' ' + styles.mobile}>
            <IconButton
              icon={<MenuIcon />}
              bordered
              title={Locale.Chat.Actions.ChatList}
              onClick={() => setSideBarOpen(true)}
            />
          </div>
          <div className={styles['window-action-button']}>
            <Link href="/premium" prefetch={true}>
              <IconButton icon={<ShoppingIcon />} bordered />
            </Link>
          </div>
          <div className={styles['window-action-button']}>
            <Link href="/profile" prefetch={true}>
              <IconButton
                icon={<UserIcon />}
                bordered
                title={Locale.Profile.Title}
              />
            </Link>
          </div>
          {/*<div className={styles['window-action-button']}>*/}
          {/*  <IconButton*/}
          {/*    icon={<BrainIcon />}*/}
          {/*    bordered*/}
          {/*    title={Locale.Chat.Actions.CompressedHistory}*/}
          {/*    onClick={() => {*/}
          {/*      // showMemoryPrompt(session);*/}
          {/*    }}*/}
          {/*  />*/}
          {/*</div>*/}
          {/*<div className={styles['window-action-button']}>*/}
          {/*  <IconButton*/}
          {/*    icon={<ExportIcon />}*/}
          {/*    bordered*/}
          {/*    title={Locale.Chat.Actions.Export}*/}
          {/*    onClick={() => {*/}
          {/*      // exportMessages(session.messages, session.topic);*/}
          {/*    }}*/}
          {/*  />*/}
          {/*</div>*/}
        </div>
      </div>

      <div className={styles['chat-body']}>
        {messages.map((message, i) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={i}
              className={
                isUser ? styles['chat-message-user'] : styles['chat-message']
              }
            >
              <div className={styles['chat-message-container']}>
                <div className={styles['chat-message-avatar']}>
                  <Avatar role={message.role} />
                  {!isUser && (
                    <div className={clsx(styles['chat-actionbar'],styles['chat-bubble-actionbar'])}>
                      {
                        message.isStreaming ?
                          <div className={clsx(styles['chat-actionbar-item'],styles['no-hover'])} onClick={() => onUserStop()}>
                            <div className={styles['icon']}>
                              <StopIcon />
                            </div>
                            <div className={styles['text']}>
                              {Locale.Chat.Actions.Stop}
                            </div>
                          </div> :
                          <>
                            <div className={styles['chat-actionbar-item']}
                            // onClick={() => onResend(i)}
                            >
                              <div className={styles['icon']}>
                                <ReloadIcon />
                              </div>
                              <div className={styles['text']}>
                                {Locale.Chat.Actions.Retry}
                              </div>
                            </div>
                            <div className={styles['chat-actionbar-item']}
                            //onClick={() => onUserDelete()}
                            >
                              <div className={styles['icon']}>
                                <DeleteIcon />
                              </div>
                              <div className={styles['text']}>
                                {Locale.Chat.Actions.Delete}
                              </div>
                            </div>
                            <div className={styles['chat-actionbar-item']} onClick={() => copyToClipboard(message.content)}>
                              <div className={styles['icon']}>
                                <CopyIcon />
                              </div>
                              <div className={styles['text']}>
                                {Locale.Chat.Actions.Copy}
                              </div>
                            </div>
                          </>
                      }
                    </div>
                  )}
                </div>
                {message.isStreaming && (
                  <div className={styles['chat-message-status']}>
                    {Locale.Chat.Typing}
                  </div>
                )}
                <div className={styles['chat-message-item']}>
                  {message.content.length === 0 && !isUser ? (
                    <LoadingIcon />
                  ) : (
                    <div
                      className="markdown-body"
                    // onContextMenu={(e) => onRightClick(e, message)}
                    >
                      <Markdown content={message.content} />
                    </div>
                  )}
                </div>
                {!isUser && (
                  <div className={styles['chat-message-actions']}>
                    <div className={styles['chat-message-action-date']}>
                      {new Date(message.createdAt).toLocaleString()}
                    </div>
                    {/*{message.modelId && (*/}
                    {/*  <div className={styles['chat-message-action-date']}>*/}
                    {/*    {getModelName(message.modelId)?.toUpperCase()}*/}
                    {/*  </div>*/}
                    {/*)}*/}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={latestMessageRef} style={{ opacity: 0, height: '2em' }}>
          -
        </div>
      </div>

      <div className={styles['chat-input-panel']}>
        <div className={styles['chat-actionbar']}>
          <div className={styles['chat-actionbar-item']}>
            <div className={styles['icon']}>
              <CommandIcon />
            </div>
            <div className={styles['text']}>
              {Locale.Chat.ActionBar.Command}
            </div>
          </div>
        </div>
        <div className={styles['chat-input-panel-inner']}>
          <textarea
            ref={inputRef}
            className={styles['chat-input']}
            placeholder={Locale.Chat.Input(submitKey)}
            rows={3}
            onInput={(e) => setUserInput(e.currentTarget.value)}
            value={userInput}
            onKeyDown={(e) => onInputKeyDown(e)}
            onFocus={() => setAutoScroll(true)}
            onBlur={() => setAutoScroll(false)}
            autoFocus={sidebarOpen}
          />
          <IconButton
            icon={<SendWhiteIcon />}
            text={Locale.Chat.Send}
            className={styles['chat-input-send'] + ' no-dark'}
            onClick={onUserSubmit}
          />
        </div>
      </div>
    </div>
  );
}
