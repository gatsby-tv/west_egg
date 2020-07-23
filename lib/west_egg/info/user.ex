defmodule WestEgg.Info.User do
  use WestEgg.Info,
    prefix: "user",
    sigil: "@",
    bucket: :users

  @impl true
  def authorized?(conn, opts), do: Auth.verified?(conn, as: opts[:id])

  public :users, [
    "profile",
    "preferences",
    "photo"
  ]

  private :secrets, [
    "contact_info",
    "payment_info",
    "history"
  ]
end