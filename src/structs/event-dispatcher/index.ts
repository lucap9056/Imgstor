/**
 * Thin typed wrapper around the native EventTarget/CustomEvent APIs.
 *
 * @example
 * type EventDefinitions = {
 *   AnyChanged: unknown;
 * };
 * export type Event<EventName extends keyof EventDefinitions> = CustomEvent<
 *   EventDefinitions[EventName]
 * >;
 */
class EventDispatcher<EventDefinitions extends Record<string, unknown>> {
  private target = new EventTarget();

  /**
   * Registers an event handler.
   *
   * @param event - The name of the event to listen to.
   * @param handler - The callback function to handle the event.
   */
  public on<EventName extends keyof EventDefinitions & string>(
    event: EventName,
    handler: (e: CustomEvent<EventDefinitions[EventName]>) => void,
  ): void {
    this.target.addEventListener(event, handler as EventListener);
  }

  /**
   * Unregisters an event handler.
   *
   * @param event - The name of the event to remove the handler from.
   * @param handler - The callback function to be removed.
   */
  public off<EventName extends keyof EventDefinitions & string>(
    event: EventName,
    handler: (e: CustomEvent<EventDefinitions[EventName]>) => void,
  ): void {
    this.target.removeEventListener(event, handler as EventListener);
  }

  /**
   * Emits an event to notify all registered handlers.
   *
   * @param event - The name of the event to emit.
   * @param detail - The payload to send with the event.
   */
  protected emit<EventName extends keyof EventDefinitions & string>(
    event: EventName,
    detail: EventDefinitions[EventName],
  ): void {
    this.target.dispatchEvent(new CustomEvent(event, { detail }));
  }
}

export default EventDispatcher;
