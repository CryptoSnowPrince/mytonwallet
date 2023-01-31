import React, {
  memo, useCallback, useEffect, useMemo, useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import { GlobalState, TransferState, UserToken } from '../../global/types';

import {
  ANIMATED_STICKER_SMALL_SIZE_PX,
  CARD_SECONDARY_VALUE_SYMBOL,
  TON_TOKEN_SLUG,
} from '../../config';
import { ANIMATED_STICKERS_PATHS } from '../ui/helpers/animatedAssets';
import { bigStrToHuman } from '../../global/helpers';
import buildClassName from '../../util/buildClassName';
import { formatCurrencyExtended } from '../../util/formatNumber';
import captureKeyboardListeners from '../../util/captureKeyboardListeners';
import { selectCurrentAccountTokens } from '../../global/selectors';
import usePrevious from '../../hooks/usePrevious';
import useCurrentOrPrev from '../../hooks/useCurrentOrPrev';
import useLang from '../../hooks/useLang';

import Modal from '../ui/Modal';
import ModalHeader from '../ui/ModalHeader';
import Transition from '../ui/Transition';
import TransferInitial from './TransferInitial';
import PasswordForm from '../ui/PasswordForm';
import Button from '../ui/Button';
import AnimatedIconWithPreview from '../ui/AnimatedIconWithPreview';
import InteractiveTextValue from '../ui/InteractiveTextValue';
import TransferResult from '../common/TransferResult';

import modalStyles from '../ui/Modal.module.scss';
import styles from './Transfer.module.scss';

interface StateProps {
  currentTransfer: GlobalState['currentTransfer'];
  tokens?: UserToken[];
}

const AMOUNT_PRECISION = 4;

function TransferModal({
  currentTransfer: {
    state,
    amount,
    toAddress,
    fee,
    comment,
    promiseId,
    error,
    isLoading,
    txId,
    tokenSlug,
  }, tokens,
}: StateProps) {
  const {
    submitTransferConfirm, submitTransferPassword, setTransferScreen, cleanTransferError, cancelTransfer,
    showTransactionInfo, startTransfer,
  } = getActions();

  const lang = useLang();
  const isOpen = state !== TransferState.None;
  const renderingState = useCurrentOrPrev(isOpen ? state : undefined, true) ?? -1;
  const [nextKey, setNextKey] = useState(renderingState + 1);
  const updateNextKey = useCallback(() => {
    setNextKey(renderingState + 1);
  }, [renderingState]);
  const selectedToken = useMemo(() => tokens?.find((token) => token.slug === tokenSlug), [tokenSlug, tokens]);
  const renderedTokenBalance = usePrevious(selectedToken?.amount, true);
  const renderedTransactionAmount = usePrevious(amount, true);
  const symbol = selectedToken?.symbol || '';

  useEffect(() => {
    if (isOpen) {
      updateNextKey();
    }
  }, [isOpen, updateNextKey]);

  useEffect(() => (
    state === TransferState.Confirm
      ? captureKeyboardListeners({
        onEnter: () => {
          submitTransferConfirm();
        },
      })
      : undefined
  ), [state, submitTransferConfirm]);

  const handleTransferSubmit = useCallback((password: string) => {
    submitTransferPassword({ password });
  }, [submitTransferPassword]);

  const handleModalClose = useCallback(() => {
    setNextKey(TransferState.None);
  }, []);

  const handleBackClick = useCallback(() => {
    if (state === TransferState.Confirm) {
      setTransferScreen({ state: TransferState.Initial });
    }
    if (state === TransferState.Password) {
      setTransferScreen({ state: TransferState.Confirm });
    }
    setNextKey(nextKey - 1);
  }, [nextKey, setTransferScreen, state]);

  const handleTransactionInfoClick = useCallback(() => {
    cancelTransfer();
    showTransactionInfo({ txId });
  }, [cancelTransfer, showTransactionInfo, txId]);

  const handleTransactionRepeatClick = useCallback(() => {
    console.log("TG_LOG handleTransactionRepeatClick", tokenSlug)
    startTransfer({
      tokenSlug: tokenSlug || TON_TOKEN_SLUG,
      toAddress,
      amount,
      comment,
    });
  }, [amount, comment, startTransfer, toAddress, tokenSlug]);

  function renderComment() {
    if (!comment) {
      return undefined;
    }

    return (
      <>
        <div className={styles.label}>{lang('Comment')}</div>
        <div className={buildClassName(styles.inputReadOnly, styles.inputReadOnly_words)}>{comment}</div>
      </>
    );
  }

  function renderConfirm(isActive: boolean) {
    return (
      <>
        <ModalHeader title={lang('Is it all ok?')} onClose={cancelTransfer} />
        <div className={modalStyles.transitionContent}>
          <AnimatedIconWithPreview
            size={ANIMATED_STICKER_SMALL_SIZE_PX}
            play={isActive}
            noLoop={false}
            nonInteractive
            className={buildClassName(styles.sticker, styles.sticker_sizeSmall)}
            tgsUrl={ANIMATED_STICKERS_PATHS.bill}
            previewUrl={ANIMATED_STICKERS_PATHS.billPreview}
          />
          <div className={styles.label}>{lang('Receiving Address')}</div>
          <InteractiveTextValue
            address={toAddress!}
            copyNotification={lang('Address was copied!')}
            className={styles.addressWidget}
          />

          <div className={styles.label}>{lang('Amount')}</div>
          <div className={styles.inputReadOnly}>
            {formatCurrencyExtended(amount || 0, '', true)}
            <span className={styles.suffix}>{symbol}</span>
            {fee && (
              <>
                <div className={styles.feeLabel}>{lang('Fee')}</div>
                <span className={styles.feeConfirm}>
                  {formatCurrencyExtended(bigStrToHuman(fee), CARD_SECONDARY_VALUE_SYMBOL)}
                </span>
              </>
            )}
          </div>

          {renderComment()}

          <div className={modalStyles.buttons}>
            {promiseId ? (
              <Button onClick={cancelTransfer}>{lang('Cancel')}</Button>
            ) : (
              <Button onClick={handleBackClick}>{lang('Edit')}</Button>
            )}
            <Button
              isPrimary
              isLoading={isLoading}
              onClick={submitTransferConfirm}
            >
              {lang('Confirm')}
            </Button>
          </div>
        </div>
      </>
    );
  }

  function renderPassword(isActive: boolean) {
    return (
      <>
        <ModalHeader title={lang('Confirm Transaction')} onClose={cancelTransfer} />
        <PasswordForm
          isActive={isActive}
          isLoading={isLoading}
          error={error}
          placeholder={lang('Enter your password')}
          onCleanError={cleanTransferError}
          onSubmit={handleTransferSubmit}
          submitLabel={lang('Send')}
          onCancel={handleBackClick}
          cancelLabel={lang('Back')}
        />
      </>
    );
  }

  function renderComplete(isActive: boolean) {
    return (
      <>
        <ModalHeader title={lang('Coins have been sent!')} onClose={cancelTransfer} />

        <div className={modalStyles.transitionContent}>
          <TransferResult
            playAnimation={isActive}
            amount={renderedTransactionAmount ? -renderedTransactionAmount : undefined}
            tokenSymbol={symbol}
            precision={AMOUNT_PRECISION}
            balance={renderedTokenBalance}
            fee={fee ? bigStrToHuman(fee) : 0}
            operationAmount={amount ? -amount : undefined}
            firstButtonText={txId ? lang('Details') : undefined}
            secondButtonText={lang('Repeat')}
            onFirstButtonClick={handleTransactionInfoClick}
            onSecondButtonClick={handleTransactionRepeatClick}
          />

          <div className={modalStyles.buttons}>
            <Button onClick={cancelTransfer} isPrimary>{lang('Close')}</Button>
          </div>
        </div>
      </>
    );
  }

  // eslint-disable-next-line consistent-return
  function renderContent(isActive: boolean, isFrom: boolean, currentKey: number) {
    switch (currentKey) {
      case TransferState.Initial:
        return (
          <>
            <ModalHeader title={lang('Send')} onClose={cancelTransfer} />
            <TransferInitial />
          </>
        );

      case TransferState.Confirm:
        return renderConfirm(isActive);

      case TransferState.Password:
        return renderPassword(isActive);

      case TransferState.Complete:
        return renderComplete(isActive);
    }
  }

  return (
    <Modal
      hasCloseButton
      isSlideUp
      isOpen={isOpen}
      onClose={cancelTransfer}
      noBackdropClose
      onCloseAnimationEnd={handleModalClose}
      dialogClassName={styles.modalDialog}
    >
      <Transition
        name="push-slide"
        className={buildClassName(modalStyles.transition, 'custom-scroll')}
        slideClassName={modalStyles.transitionSlide}
        activeKey={renderingState}
        nextKey={nextKey}
        onStop={updateNextKey}
      >
        {renderContent}
      </Transition>
    </Modal>
  );
}

export default memo(withGlobal((global): StateProps => {
  console.log("TG_LOG: memo(withGlobal((global): StateProps: ", global)
  return {
    currentTransfer: global.currentTransfer,
    tokens: selectCurrentAccountTokens(global),
  };
})(TransferModal));
