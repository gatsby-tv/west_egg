defmodule WestEgg.Auth.Sessions do
  @behaviour Plug.Session.Store
  alias WestEgg.{Auth, Repo}

  def init(opts), do: opts

  def get(_conn, sid, _opts) when sid in [nil, ""] do
    {nil, %{}}
  end

  def get(_conn, sid, _opts) do
    with {:ok, session} <- Repo.fetch(:repo, :sessions, :users, sid) do
      {sid, session}
    else
      _ -> {nil, %{}}
    end
  end

  def put(_conn, sid, session, _opts) do
    if is_nil(sid) do
      user = session["user"]
      if is_nil(user), do: raise(Auth.InvalidSessionError)

      sid =
        :crypto.strong_rand_bytes(64)
        |> Base.encode32(padding: false)
        |> String.downcase()

      put_method_if = fn methods, key, method ->
        if session[key], do: Map.put_new(methods, key, method), else: methods
      end

      methods =
        %{"user" => Repo.set(user)}
        |> put_method_if.("password?", Repo.enable())
        |> put_method_if.("verified?", Repo.enable())

      Repo.modify(:repo, :sessions, :users, sid, methods)

      sid
    else
      sid
    end
  end

  def delete(_conn, sid, _opts) do
    Repo.drop(:repo, :sessions, :users, sid)
  end
end